#! /usr/bin/sh
rm gosshub.db
python3 -c "from app import *; create_tables()"
echo "Done."
