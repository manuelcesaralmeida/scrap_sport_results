#!/bin/bash

echo "Script name: $0"

pwd

cd

pwd

echo "Waiting 100 seconds (press any key to continue early)..."
read -t 100 -p "Press Enter to continue..."
echo "Continuing..."



#cd /home/cesar/ces/bets/webbet
#cd /Users/cesaralmeida/ces
cd /home/cesar/ces/bets/scrap_sport_results


find . -name "*_Soccer_*" -exec cp {} report \; -delete

find . -name "handicap_*" -exec cp {} report \; -delete

find . -name "events_*.json" -exec cp {} report \; -delete

echo "Waiting 10 seconds (press any key to continue early)..."
read -t 10 -p "Press Enter to continue..."
echo "Continuing..."
