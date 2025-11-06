#!/bin/bash

# Farben für Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== GIT AUTO-PUSH SKRIPT ===${NC}"

# Frage nach der Version
read -p "Welche Version? (z.B. 1.5.0): " VERSION

# Validiere Eingabe
if [[ -z "$VERSION" ]]; then
    echo "Fehler: Keine Version angegeben!"
    exit 1
fi

# Git-Befehle ausführen
echo -e "${GREEN}Staging aller Änderungen...${NC}"
git add .

echo -e "${GREEN}Commit mit Version UPDATE_$VERSION...${NC}"
git commit -m "UPDATE_$VERSION"

echo -e "${GREEN}Push zu origin main...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Erfolgreich gepusht! Version: UPDATE_$VERSION${NC}"
else
    echo "Push fehlgeschlagen. Überprüfe deine Internetverbindung oder Zugangsdaten."
    exit 1
fi


