import { createClient } from '@clickhouse/client';
const client = createClient({
    host: 'http://localhost:8123',
    username: 'default',
    password: '',
    database: 'restaurants'
});
const resultSet = await client.query({
    query: `SELECT
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
const resultJson = await resultSet.json();
console.log(resultJson.data[3]);
