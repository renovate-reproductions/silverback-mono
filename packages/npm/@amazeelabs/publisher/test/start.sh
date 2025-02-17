#!/usr/bin/env bash

echo "Initializing build";
sleep 1
echo "Build step 1/5";
sleep 1
echo "Build step 2/5";
sleep 1
echo "Build step 3/5";
sleep 1
echo "Build step 4/5";
sleep 1
echo "Build step 5/5";

DIR=$(dirname "$0")
BUILD_DIR="$DIR/public"

if [ -d "$BUILD_DIR" ]; then
  echo "Build directory already exists."
else
  mkdir -p "$BUILD_DIR";
  echo "1" > "$BUILD_DIR/count.txt"
  echo "<html><head></head><body><h1>Build Nr.: 1</h1></body></html>" > "$BUILD_DIR/index.html"
  echo "<html><head></head><body><h1>Not found!</h1></body></html>" > "$BUILD_DIR/404.html"
fi

sleep 1

echo "Starting server"
sleep 1
CI=true yarn serve -p 3002 "test/public"
