#!/bin/bash
BRANCH=$(git branch --show-current)
git checkout release
git merge master
git checkout $BRANCH
