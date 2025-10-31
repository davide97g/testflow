#!/bin/bash

# Setup Environment Script
# Copies .env.example to .env if it doesn't already exist

if [ -f .env ]; then
  echo ".env file already exists. Skipping copy."
  exit 0
fi

if [ ! -f .env.example ]; then
  echo "Error: .env.example file not found."
  exit 1
fi

cp .env.example .env
echo ".env file created from .env.example"
echo "Please edit .env and add your API tokens."

