# Checklist

1. Set up a new Google Account
2. Set up a new Google Cloud Platform account
3. Create a new firebase project
4. `firebase login`
5. `firebase use --add`, select created firebase project and set alias to `default`
6. `firebase deploy`
7. `npm run add-user <email>` for every email address you want to give access to
8. `firebase apps:create WEB checklist`
9. `firebase apps:sdkconfig WEB --json | jq '.result.sdkConfig' > ./src/firebase-sdk-config.json`
10. In the firebase console, enable Google authentication