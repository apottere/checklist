#!/bin/bash

email="$1"
cleaned="$(echo -n "$email" | sed -e 's/\./\&/g')"
firebase database:set "/meta/allowlist/$cleaned" --data "\"$email\""