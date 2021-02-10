# composable-app

## Proof of Concept Summary

Compare query performance between a monolithic API and multiple modular/autonomous bounded context APIs.  The bounded context API will have no dependencies or even knowledge of one another. This example breaks the monolithic dataset into 5 separate bounded contexts as listed below:

* Account Categories (accountCategories, scheduleVendorAcctCategoryAssocs)
* Lot (lot)
* Organization (financialCommunity, planCommunity)
* Job (job, pendingConstructionStages)
* Schedules (scheduleTasks, masterTasks)

The original query against the monolithic API includes 9 tables with a maximum expand depth of 4.  The new query against the separated bounded contexts, includes the same 9 tables with a maximum expand depth of 2, but requiring more requests to the API to get each bounded context separatly.

## Goal

The goal of this POC is to prove we can take our current most complex query, and get back the exact same result in equal or less time across multiple bounded contexts that we can on a single monolithic context.  The outcome of this test was an average of 21% performance improvement, exceeding the objective.

## Composable Application Advantages (not measured in this POC)

* Better support `parallel work streams` with reduced risk of code change conflicts
* Simplify our ability to achieve `shorter sprints` and `zero downtime deployments`
* Need for `application level regression testing is eliminated` while simultaniously improving quality
* `Future proofing the foundation`
  * No future re-writes (end of Waterfall) even if we need to completely change the underlying technology foundation or business process
  * Open up opportunities to leverage best of breed technologies without requiring application re-writes
    * Example: Active/active multi-master distributed SQL
  * More easily absorb future technology advancements or shifts in direction
  * `Reduce vendor lock-in`, `increase portability`, and give us more `control over licensing costs`
* `Cheaper and greater scalability` due to horizontal scalability being cheaper and without the upper limit of vertical scalability (commodity hardware)
* Easily `move data objects` from application specific to business commonly shared with little to no effort
  * Will be needed for Purchase Pro's Bill of Materials, and for Home Designer's Rules Engine
* Create a platform for `business self-service` that not just exposes the needed data, but also the supporting business rules
* Simplify our ability to `join non-structured data` with our existing structured data
* Simplify `embedding reporting` (analytical data) within an application (operational data)

## Setup

1) `git clone` this repository
2) run `npm install` to download all the needed node modules
3) Add a `nodemon.json` configuration file to the application folder with the following format:
```json
{
    "env": {
        "apiKey": "<your API key here>",
        "apiBaseUrl": "https://<website name here>/odata"
    }
}
```
4) run `npm start`