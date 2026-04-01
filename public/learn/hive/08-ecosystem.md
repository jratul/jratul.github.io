---
title: "Hive 생태계와 연동"
order: 8
---

## Hive Metastore 공유

Hive Metastore는 단순한 Hive 전용 저장소가 아닙니다. **다양한 빅데이터 도구가 공유**합니다.

```
Hive Metastore (MySQL/PostgreSQL)
    ↑ 테이블 스키마, 파티션 정보, 위치
    │
    ├── Hive (HiveQL)
    ├── Spark (spark.sql)
    ├── Presto / Trino
    ├── Flink
    └── Airbyte / dbt
```

---

## Spark + Hive Metastore

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("MyApp") \
    .config("spark.sql.warehouse.dir", "/user/hive/warehouse") \
    .config("hive.metastore.uris", "thrift://metastore-host:9083") \
    .enableHiveSupport() \
    .getOrCreate()

# Hive 테이블 읽기
df = spark.sql("SELECT * FROM shop.orders WHERE dt = '2024-01-15'")

# Hive 테이블 쓰기
df.write \
    .mode("append") \
    .partitionBy("dt") \
    .saveAsTable("shop.processed_orders")

# 파티션 쿼리 (Hive 파티션 메타데이터 활용)
spark.sql("MSCK REPAIR TABLE shop.orders")
```

---

## Presto / Trino + Hive

Presto/Trino는 Hive Metastore를 카탈로그로 사용해 **대화형 쿼리(Interactive Query)**를 실행합니다. Hive보다 10-100배 빠릅니다.

```sql
-- Trino 설정 (etc/catalog/hive.properties)
connector.name=hive
hive.metastore.uri=thrift://metastore-host:9083
hive.config.resources=/etc/hadoop/core-site.xml,/etc/hadoop/hdfs-site.xml

-- Trino에서 Hive 테이블 쿼리
SELECT category, SUM(total) AS revenue
FROM hive.shop.orders
WHERE dt BETWEEN '2024-01-01' AND '2024-01-31'
  AND status = 'PAID'
GROUP BY category
ORDER BY revenue DESC;
```

---

## 데이터 레이크 아키텍처

```
                    데이터 수집
                        │
        ┌───────────────┼───────────────┐
        │               │               │
  Kafka (스트림)    Airbyte (배치)   파일 업로드
        │               │               │
        └───────────────┴───────────────┘
                        │
                    HDFS / S3
                  (Raw Zone)
                        │
              Hive / Spark (ETL)
                        │
                    HDFS / S3
                 (Processed Zone)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
      Hive          Presto/Trino     Spark
   (배치 ETL)      (대화형 쿼리)    (ML, 복잡한 처리)
        │               │               │
        └───────────────┴───────────────┘
                        │
                   BI Tool / 대시보드
              (Superset, Redash, Metabase)
```

---

## Hue (Hive Web UI)

Hue는 Hadoop 에코시스템의 **웹 기반 쿼리 에디터**입니다.

```yaml
# docker-compose.yml
hue:
  image: gethue/hue:latest
  environment:
    - HIVE_SERVER_HOST=hiveserver2
    - HIVE_SERVER_PORT=10000
  ports:
    - "8888:8888"
```

**주요 기능:**
- Hive/Impala/Spark SQL 웹 에디터
- 데이터 탐색기 (HDFS 파일, Hive 테이블)
- 쿼리 히스토리 및 공유
- 스케줄러 (Oozie 연동)

---

## Apache Oozie (워크플로 스케줄러)

Hadoop 에코시스템의 **워크플로 스케줄러**입니다. Hive 쿼리, Spark Job, HDFS 작업을 시간이나 이벤트 기반으로 실행합니다.

```xml
<!-- workflow.xml -->
<workflow-app name="daily-etl">
  <start to="hive-transform"/>

  <action name="hive-transform">
    <hive xmlns="uri:oozie:hive-action:0.2">
      <job-tracker>${jobTracker}</job-tracker>
      <name-node>${nameNode}</name-node>
      <script>scripts/daily_etl.hql</script>
      <param>DT=${dt}</param>
    </hive>
    <ok to="end"/>
    <error to="fail"/>
  </action>

  <kill name="fail">
    <message>Job failed: ${wf:errorMessage(wf:lastErrorNode())}</message>
  </kill>
  <end name="end"/>
</workflow-app>
```

```xml
<!-- coordinator.xml (스케줄) -->
<coordinator-app name="daily-etl-coord" frequency="${coord:days(1)}"
                 start="${startTime}" end="${endTime}">
  <action>
    <workflow>
      <app-path>${workflowPath}</app-path>
      <configuration>
        <property><name>dt</name><value>${coord:formatTime(coord:nominalTime(), 'yyyy-MM-dd')}</value></property>
      </configuration>
    </workflow>
  </action>
</coordinator-app>
```

---

## Hive JDBC 연결

```java
// Java/Kotlin에서 Hive 연결
Class.forName("org.apache.hive.jdbc.HiveDriver");
Connection conn = DriverManager.getConnection(
    "jdbc:hive2://hiveserver2-host:10000/shop",
    "hive_user",
    "password"
);

Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(
    "SELECT * FROM orders WHERE dt = '2024-01-15' LIMIT 1000"
);

while (rs.next()) {
    System.out.println(rs.getLong("order_id") + ", " + rs.getString("status"));
}
```

```kotlin
// Spring JDBC Template
@Bean
fun hiveDataSource(): DataSource {
    return DriverManagerDataSource(
        "jdbc:hive2://hiveserver2:10000/shop",
        "hive_user",
        "password"
    ).apply {
        driverClassName = "org.apache.hive.jdbc.HiveDriver"
    }
}
```
