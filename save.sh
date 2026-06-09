#!/bin/zsh
git add -A
git commit -m "${*:-update}"
git push
