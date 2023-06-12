# ClickHouse integration with Kafka, using native Kafka engine

This prooof of concept streams GitHub data regarding ClickHouse official repo to Kafka. Same data is transfered and stored to ClickHouse using native Kafka engine.

## Docker containers

1. [portainer - localhost:900](http://localhost:900) - used for managing Docker containers and monitoring logs
2. [tabix - localhost:8888](http://localhost:8888) - GUI for interacting with ClickHouse. Automatically connects to the **kafka** database with default account.
3. clickhouse - ClickHouse server with default ports open. On startup creates **kafka** database with necessary tables (see **Tables and queries**).
4. kafka - Kafka instance with default ports open for ClickHouse to integrate with. 
5. kafka-topic-init - this image creates topic **clickhouse-test** on **kafka** container and loads data.

## Tables and queries

Using ClickHouses Kafka engine, each message can be read only once, so SELECT queries on such tables has little value. It is more practical to move data from mentioned table using materialized views into table that will store streamed events. To achieve that we:

1. Create a table with the desired structure
2. Use the engine to create a Kafka consumer and consider it a data stream
3. Create a materialized view that converts data from **github_queue** and stores it permanently into **github** table

Script with all the queries can be found in file *.docker/clickhouse/docker-entrypoint-initdb.d/kafka-db-setup.sql*

### Step 1 - Create a table with the desired structure

We create table **github** that will store streamed events. This structure fits the JSON structure that ClickHouse receives from Kafka.

Json structure:

```
{
    "file_time": "2019-09-23 11:00:00",
    "event_type": "PullRequestReviewCommentEvent",
    "actor_login": "excitoon",
    "repo_name": "ClickHouse\/ClickHouse", 
    "created_at": "2019-09-23 11:25:54",
    "updated_at": "2019-09-23 11:25:54",
    "action": "created",
    "comment_id": "327062451",
    "path": "dbms\/src\/TableFunctions\/TableFunctionS3.h",
    "ref": "",
    "ref_type": "none",
    "creator_user_login": "excitoon",
    "number": 5596,
    "title": "s3 table function and storage",
    "labels": [
        "can be tested",
        "pr-feature"
    ],
    "state": "closed",
    "assignee": "",
    "assignees": [],
    "closed_at": "2019-09-22 21:53:07",
    "merged_at": "2019-09-22 21:53:07",
    "merge_commit_sha": "2054f80623f0454b1aabeccbaffc49e17e005926",
    "requested_reviewers": [
        "stavrolia"
    ],
    "merged_by": "",
    "review_comments": 0,
    "member_login": ""
}
```

Query to create **github** table

```
CREATE TABLE kafka.github
(
    file_time DateTime,
    event_type Enum('CommitCommentEvent' = 1, 'CreateEvent' = 2, 'DeleteEvent' = 3, 'ForkEvent' = 4, 'GollumEvent' = 5, 'IssueCommentEvent' = 6, 'IssuesEvent' = 7, 'MemberEvent' = 8, 'PublicEvent' = 9, 'PullRequestEvent' = 10, 'PullRequestReviewCommentEvent' = 11, 'PushEvent' = 12, 'ReleaseEvent' = 13, 'SponsorshipEvent' = 14, 'WatchEvent' = 15, 'GistEvent' = 16, 'FollowEvent' = 17, 'DownloadEvent' = 18, 'PullRequestReviewEvent' = 19, 'ForkApplyEvent' = 20, 'Event' = 21, 'TeamAddEvent' = 22),
    actor_login LowCardinality(String),
    repo_name LowCardinality(String),
    created_at DateTime,
    updated_at DateTime,
    action Enum('none' = 0, 'created' = 1, 'added' = 2, 'edited' = 3, 'deleted' = 4, 'opened' = 5, 'closed' = 6, 'reopened' = 7, 'assigned' = 8, 'unassigned' = 9, 'labeled' = 10, 'unlabeled' = 11, 'review_requested' = 12, 'review_request_removed' = 13, 'synchronize' = 14, 'started' = 15, 'published' = 16, 'update' = 17, 'create' = 18, 'fork' = 19, 'merged' = 20),
    comment_id UInt64,
    path String,
    ref LowCardinality(String),
    ref_type Enum('none' = 0, 'branch' = 1, 'tag' = 2, 'repository' = 3, 'unknown' = 4),
    creator_user_login LowCardinality(String),
    number UInt32,
    title String,
    labels Array(LowCardinality(String)),
    state Enum('none' = 0, 'open' = 1, 'closed' = 2),
    assignee LowCardinality(String),
    assignees Array(LowCardinality(String)),
    closed_at DateTime,
    merged_at DateTime,
    merge_commit_sha String,
    requested_reviewers Array(LowCardinality(String)),
    merged_by LowCardinality(String),
    review_comments UInt32,
    member_login LowCardinality(String)
) ENGINE = MergeTree ORDER BY (event_type, repo_name, created_at);
```

## Step 2 - Use the engine to create a Kafka consumer

Following query creates **github_queue** table that uses native Kafka engine, that behaves like consumer.

```
CREATE TABLE kafka.github_queue
(
    file_time DateTime,
    event_type Enum('CommitCommentEvent' = 1, 'CreateEvent' = 2, 'DeleteEvent' = 3, 'ForkEvent' = 4, 'GollumEvent' = 5, 'IssueCommentEvent' = 6, 'IssuesEvent' = 7, 'MemberEvent' = 8, 'PublicEvent' = 9, 'PullRequestEvent' = 10, 'PullRequestReviewCommentEvent' = 11, 'PushEvent' = 12, 'ReleaseEvent' = 13, 'SponsorshipEvent' = 14, 'WatchEvent' = 15, 'GistEvent' = 16, 'FollowEvent' = 17, 'DownloadEvent' = 18, 'PullRequestReviewEvent' = 19, 'ForkApplyEvent' = 20, 'Event' = 21, 'TeamAddEvent' = 22),
    actor_login LowCardinality(String),
    repo_name LowCardinality(String),
    created_at DateTime,
    updated_at DateTime,
    action Enum('none' = 0, 'created' = 1, 'added' = 2, 'edited' = 3, 'deleted' = 4, 'opened' = 5, 'closed' = 6, 'reopened' = 7, 'assigned' = 8, 'unassigned' = 9, 'labeled' = 10, 'unlabeled' = 11, 'review_requested' = 12, 'review_request_removed' = 13, 'synchronize' = 14, 'started' = 15, 'published' = 16, 'update' = 17, 'create' = 18, 'fork' = 19, 'merged' = 20),
    comment_id UInt64,
    path String,
    ref LowCardinality(String),
    ref_type Enum('none' = 0, 'branch' = 1, 'tag' = 2, 'repository' = 3, 'unknown' = 4),
    creator_user_login LowCardinality(String),
    number UInt32,
    title String,
    labels Array(LowCardinality(String)),
    state Enum('none' = 0, 'open' = 1, 'closed' = 2),
    assignee LowCardinality(String),
    assignees Array(LowCardinality(String)),
    closed_at DateTime,
    merged_at DateTime,
    merge_commit_sha String,
    requested_reviewers Array(LowCardinality(String)),
    merged_by LowCardinality(String),
    review_comments UInt32,
    member_login LowCardinality(String)
)
ENGINE = Kafka('kafka:9092', 'clickhouse-test', 'group1', 'JSONEachRow')
SETTINGS kafka_thread_per_consumer = 0;
```

Parameters passed to `Kafka()` are mandatory. In order of occurence:
1. kafka host - in our example hostname is **kafka** and it uses default port
2. topic list - as created in **kafka-topic-init** container, our topic name is **clickhouse-test**. This can be a list of multiple topics, it is not limited to one topic
3. group name - A group of Kafka consumers on ClickHouse server and replications. We use this to control duplication of events coming from Kafka. If you want events to be unique in the cluster, use the same group name everywhere. If you want to get the data twice, then create a copy of the table with another group name.
4. kafka_format — Message format. Uses the same notation as the SQL FORMAT function, see available options [here](https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow)

In our example we are loading *.docker/kafka-topic-init/github_all_columns.ndjson* file line by line. ndjson is a file with one JSON per line, every line seperated with `\n`. Because of that, we specified `kafka_format = JSONEachRow` because it matches this file format. There are a lot of available options.

### Step 3 - Create a materialized view that converts data from **github_queue** and stores it permanently into **github** table

We create materialized view that will consume data from Kafka/**github_queue** table and store it permanently in ClickHouse/**github** table. Following query creates such materialized view:

```
CREATE MATERIALIZED VIEW kafka.github_mv
TO kafka.github AS
SELECT *
FROM kafka.github_queue;
```

## Metadata

Kafka events metadata are available to be also displayed and stored in ClickHouse. These metadata can be found in following virual columns:

- _topic — Kafka topic
- _key — Key of the message
- _offset — Offset of the message
- _timestamp — Timestamp of the message
- _timestamp_ms — Timestamp in milliseconds of the message
- _partition — Partition of Kafka topic
- _headers.name — Array of message's headers keys
- _headers.value — Array of message's headers values

Example of using metadata can be found [here](https://clickhouse.com/docs/en/integrations/kafka#adding-kafka-metadata)

## Reference

[ClickHouse and Kafka integration reference](https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)  
[Steps for integration setup with example data](https://clickhouse.com/docs/en/integrations/kafka#using-the-kafka-table-engine)  
[Data used to stream as events](https://clickhouse.com/docs/en/integrations/data-ingestion/kafka/code/producer#large-datasets)  
[ClickHouse supported formats for Input and Output Data](https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow)