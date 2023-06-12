import { ClickHouseClient, ResultSet, createClient } from '@clickhouse/client';

const client: ClickHouseClient = createClient({
  host: 'http://localhost:8123',
  username: 'default',
  password: '',
  database: 'restaurants'
});

const resultSet: ResultSet = await client.query({
  query: 
    `SELECT
      round(toUInt32OrZero(extract(menu_date, '^\\d{4}')), -1) AS decade,
      count(*) AS count,
      round(avg(price), 2) AS avg
    FROM
      menu_item_denorm
    WHERE
      (menu_currency = 'Dollars') AND
      (decade > 0) AND
      (decade < 2022)
    GROUP BY
      decade
    ORDER BY
      decade ASC`
});

type ClickhouseRowDefinition = {
  name: string,
  type: string
};

type ClickhouseQueryStatistics = {
  elapsed: number,
  rows_read: number,
  bytes_read: number
};

type AverageHistoricalPricesRow = {
  decade: number,
  count: number,
  avg: number
}

type ResultSetJson<T> = {
    rows: number,
    meta: ClickhouseRowDefinition[]
    data: T[],
    statistics: ClickhouseQueryStatistics
}

const resultJson: ResultSetJson<AverageHistoricalPricesRow> = await resultSet.json();

console.log(resultJson.data[3]);