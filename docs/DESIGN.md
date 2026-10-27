# Design

Living document: the source of truth for how the app should behave. Update it in the same change as any behavior change. Items under [Open questions](#open-questions) are undecided.

## Concepts

| Term          | Meaning                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| **Template**  | A reusable list of items in the library. Not checkable.                                                    |
| **Folder**    | Organizes templates in the library. One level deep.                                                        |
| **Checklist** | An active, checkable list, built by importing templates.                                                   |
| **Group**     | Top-level division of a checklist. Every checklist has an unnamed default group, always first.             |
| **Section**   | A template imported into a group. A template can be imported into a group once, but into several groups.  |
| **Extras**    | A section in the default group for one-off items. Shown only when it has items.                            |
| **Done**      | An item that was completed.                                                                                |
| **Skipped**   | An item that was deliberately not done or doesn't apply this time. Counts as resolved, not as done.        |
| **Archived**  | Hidden from the main screens but kept. Restorable.                                                         |

```
Checklist
├── (default group, no heading)
│   ├── Section: Toiletries
│   └── Extras
└── Group: Day 2
    ├── Section: Toiletries
    └── Section: Clothes
```

## Template sync

Active (non-archived) checklists stay in sync with the templates they imported:

- Adding, removing, editing, or reordering a template item applies to every section imported from that template, in every active checklist.
- Item state (open, done, skipped) is per checklist and never syncs. A synced removal deletes the item whatever its state.
- Items added to a checklist without adding them to a template are local to that checklist and never touched by sync.
- Archived checklists are frozen. Restoring one doesn't catch it up.
- Checking items never changes templates.

## Naming templates

- In the library, templates appear inside their folders.
- Wherever templates are picked for import, they're shown flattened as `Folder / Template`.
- In a checklist, section headings show only the template's current name. If the template has been deleted, the name from import time is shown.

## Screens

Bottom navigation with four destinations: **Checklists** (default), **Templates**, **Archive**, and **Settings**. These top-level screens have no overflow menu; detail screens (a checklist, a template) use one for actions on that item.

The FAB creates things. When a screen can create more than one kind of thing, the FAB opens a menu of them.

### Checklists

- Cards for active checklists in user-defined order, each showing name and progress (e.g. 5/12 resolved).
- Drag to reorder.
- FAB opens **New checklist**: a name and a multi-select of templates. Selected templates are imported into the default group in library order.

### Checklist

- The default group's sections come first with no group heading, then each group under its name.
- Each section is headed by its template name. Items follow the template's order; local items come after.
- Each open item has a checkbox. Swipe to skip.
- Checking moves an item to the **Done** fold; skipping moves it to the **Skipped** fold. Each is a single collapsed fold at the bottom of the checklist, using the same group and section headings as the main list. Tapping an item in a fold reopens it.
- Checklist items can't be deleted. Skipping covers "doesn't apply here".
- Overflow menu: **Edit structure**, **Rename**, **Uncheck all**, **Unskip all**, **Archive**. Uncheck all and Unskip all ask for confirmation, so each takes two deliberate steps.
- When every item is resolved, offer to archive in a snackbar.

### Edit structure

Reached from a checklist's overflow menu.

- Shows groups and their sections.
- **Groups**: add (with a name and a multi-select of templates to import), rename, remove, and drag to reorder. The default group is always first and can't be renamed, moved, or removed.
- **Sections**: import templates into a group (multi-select; templates already in that group aren't offered), remove, and drag to reorder within their group.
- Removing a section or group removes its items from the checklist, after confirmation, with Undo.

### Templates

- Folders and top-level templates in user-defined order. Folders expand to show their templates.
- Drag to reorder within the top level or within a folder. **Move to folder** in a template's menu moves it between them.
- FAB menu: **New template**, **New folder**.
- Template menu: **Rename**, **Move to folder**, **Archive**. Folder menu: **Rename**, **Delete**. Deleting a folder moves its templates to the top level.

### Template

- Items in order with drag handles. Drag to reorder.
- Inline add at the bottom; tap an item to edit its text.
- Items can be deleted here.
- All changes [sync](#template-sync) to active checklists.

### Archive

- Tabs for archived checklists and archived templates, newest first, each with **Restore** and **Delete forever** (with confirmation and Undo). An archived checklist's overflow menu also has Delete forever.
- Archived templates aren't offered for import.

### Settings

- The signed-in account and **Sign out**.
- **Check for updates**, showing the running version (its commit), and **Reload**.

### Updates

The app is served from its offline cache, so a new version installs in the background. It's checked for on load, whenever the app comes back to the foreground, and every 15 minutes while it's open. Once one is ready, a toast offers **Reload**. It stays (returning after other toasts) until used, rather than reloading on its own, so an open sheet or pending Undo is never lost. Pull-to-refresh is off for the same reason.

## Adding items

The add sheet (FAB on a checklist) has:

1. **Text**.
2. **Section**: where it goes in this checklist, as `Group / Section`. Defaults to the section last added to, or Extras.
3. **Also add to template**: an optional multi-select of templates. The section's template is listed first for one-tap selection; the rest are under **More**.

Each selected template gets the item appended, which [syncs](#template-sync) it to every section imported from that template, including in this checklist. If the chosen section's template isn't selected, the item is also added to the chosen section as a local item. All writes happen in one batch.

The sheet stays open after each add for quick entry.

## Deleting

Deleting is limited to library editing (template items and folders) and the Archive (archived templates and checklists). Everything else is archived or skipped instead. The only exception is removing sections or groups in Edit structure.

## Interaction details

- **Undo**: checking, skipping, reopening, and archiving show a snackbar with Undo. Checked and skipped rows leave the list immediately, fading as their space closes so everything below slides up; Undo covers mis-taps.
- **Swipe to skip** on open items, either direction, with a Gmail-style leave-behind: a Skip background is revealed under the row and turns solid (with a short vibration) once releasing would skip. A quick flick also skips; anything less springs back. To revisit if it interferes with scrolling.
- **Drag and drop**: uses a drag handle, not long-press on the whole row, so it doesn't fight scrolling. Must work with touch. Reordering also has a menu fallback (Move up / Move down) for accessibility.
- **Theme**: Material 3 via Beer CSS. Follows the system light/dark setting and switches live.
- **Offline**: everything works offline; see `src/lib/firebase.ts`. All data is loaded up front so it's available offline without being opened first.

## Data model

Firestore, top-level collections so everything can be loaded with a few queries.

```
folders/{id}         name, order
templates/{id}       name, folderId | null, order, archived, createdAt
templateItems/{id}   templateId, text, order
checklists/{id}      name, order, archived, createdAt,
                     groups: [{ id, name | null, sections: [{ id, templateId | null, name }] }]
checklistItems/{id}  checklistId, sectionId, templateItemId | null, text, order,
                     state: 'open' | 'done' | 'skipped'
```

- Everything is referenced by generated ID, never by name, so folders, templates, checklists, groups, and sections can all be renamed freely.
- `order` is a fractional index string, so a reorder is one write.
- A checklist's structure lives in its `groups` array; array position is display order, and the default group (`name: null`) is always first. Structure edits rewrite the array, so concurrent edits from two devices resolve as last write wins. That's acceptable for a single user.
- Synced items have a `templateItemId` and copy its `text` and `order`; local items have `templateItemId: null` and sort after them.
- Sync runs on the client: a template item write and its checklist item writes go in one batch. Everything is already loaded, so this works offline, and it needs no Cloud Functions (which would require a paid plan).
- Section `name` is the import-time fallback for when the template is deleted.
- Removing a section deletes its `checklistItems` in the same batch.
- Archiving sets `archived`; children are untouched.
- Deleting an archived checklist deletes its `checklistItems` in the same batch.
- Deleting an archived template deletes its `templateItems` in the same batch. Checklist items synced from it become local items.
- Rules validate each document's shape; only allowlisted users can read or write (unchanged).
- The prototype's `lists` and `items` collections are dropped.

## Not planned

- Sharing or collaborating with other people.
- Nested folders, or templates that include other templates.
- Reordering items within a checklist; order comes from the template.

## Open questions

None right now.
