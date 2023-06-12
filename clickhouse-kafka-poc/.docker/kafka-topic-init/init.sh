kafka-topics.sh --delete --topic clickhouse-test --bootstrap-server kafka:9092
kafka-topics.sh --create --topic clickhouse-test --bootstrap-server kafka:9092

cat github_all_columns.ndjson | kafka-console-producer.sh --topic clickhouse-test --bootstrap-server kafka:9092