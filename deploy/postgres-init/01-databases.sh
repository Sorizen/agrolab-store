#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<SQL
create role store login password '${STORE_DB_PASSWORD}';
create database agrolab_store owner store;
create role parser login password '${PARSER_DB_PASSWORD}';
create database agrolosk owner parser;
SQL
