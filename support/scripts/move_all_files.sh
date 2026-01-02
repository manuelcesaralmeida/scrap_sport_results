#!/bin/bash

echo "Script name: $0"

cd

cd /home/cesar/ces/bets/webbet
find . -name "*_Soccer_*" -exec cp {} report \; -delete

find . -name "handicap_*" -exec cp {} report \; -delete

find . -name "events_*.json" -exec cp {} report \; -delete
