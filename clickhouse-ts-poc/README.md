# TypeScript and ClickHouse - proof of concept

In this example we are using [New York Public Library "What's on the Menu?" Dataset](https://clickhouse.com/docs/en/getting-started/example-datasets/menus) sample database to demonstrate usage of TypeScript with ClickHouse. We have created Docker enviroment using docker-compose with following containers:

1. **clickhouse** (ClickHouse server, localhost:8123 and localhost:9000)
2. **tabix** (Tabix GUI tool to query ClickHouse server, access at localhost:8888)
3. **portainer** (Portainer server to manage Docker containers, access at localhost:900)

## RUn

Run command in project root directory:

`docker-compose up -d`

## Database

[New York Public Library "What's on the Menu?" Dataset](https://clickhouse.com/docs/en/getting-started/example-datasets/menus) sample database is automatically created every time **clickhouse** container is restarted. Structure is recreated and data is filled again.

