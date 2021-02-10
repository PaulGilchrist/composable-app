'use strict';

const axios = require('axios');
const chalk = require('chalk'); // Add color to the console
const https = require('https');
const args = require('minimist')(process.argv.slice(2)); // Get arguments by name rather than by index
const util = require('util');

console.clear();

// Required arguments or environment variables when using remote API calls
const apiKey = args['apiKey'] || process.env.apiKey;
const apiBaseUrl = args['apiBaseUrl'] || process.env.apiBaseUrl;

// Check to ensure the required arguments without default values are passed in
const apiRequirementsMet = (apiKey && apiBaseUrl);

const main = async () => {
    if(apiRequirementsMet) {
        // Make original API call and record execution time
        let startTime = new Date();
        let originalScheduleTasks = await getOriginalScheduleTasks();
        let endTime = new Date();
        let originalQueryElapsedTime = endTime - startTime;
        // Make new API calls and record execution and assembly time
        startTime = new Date();
        // Run queries in parallel
        let [lots, jobs] = [await getLots(), await getJobs()];
        // Setup filters for the next batch of queries
        let planCommunitiesFilter = `id in (`;
        let scheduleTasksFilter = `jobId in (`;
        jobs.forEach(j => {
            const planCommunityId = `${j.planId},`;
            if(!planCommunitiesFilter.includes(planCommunityId)) {
                planCommunitiesFilter += planCommunityId;
            }
            scheduleTasksFilter += `${j.id},`;
        });
        planCommunitiesFilter = planCommunitiesFilter.slice(0, -1) + ')';
        scheduleTasksFilter = scheduleTasksFilter.slice(0, -1) + ')';
        // Run queries in parallel
        let [financialCommunities, planCommunities, scheduleTasks] = [await getFinancialCommunities(), await getPlanCommunities(planCommunitiesFilter), await getScheduleTasks(scheduleTasksFilter)];
        let accountCategories = await getAccountCategories(scheduleTasks, scheduleTasksFilter);
        // We now have all the data from the original query
        // Let's transform the data back to the original structure for an apples to apples comparison
        scheduleTasks.forEach(st => {
            st.masterTask.acctCategory = accountCategories.find(ac => ac.id === st.masterTask.acctCategoryId);
            st.job = jobs.find(j => j.id === st.jobId);
            st.job.lot = lots.find(l => l.id === st.job.lotId);
            st.job.lot.financialCommunity = financialCommunities.find(fc => fc.id === st.job.lot.financialCommunityId);
            st.job.planCommunity = planCommunities.find(pc => pc.id === st.job.planId);
        });
        endTime = new Date();
        let newQueryElapsedTime = endTime - startTime;
        // console.log(util.inspect(scheduleTasks, false, null, true /* enable colors */));
        console.log(`Original query elapsed time = ${originalQueryElapsedTime} ms`);
        console.log(`New query elapsed time = ${newQueryElapsedTime} ms`);
    } else {
        console.warn(`Required arguments or environment variables missing`)
        console.warn(`'apiAuth' and 'apiBaseUrl' must be supplied`)
        // We do not have the required minimum informaiton to continue
        process.exit(1);
    }
}

const getAccountCategories = async (scheduleTasks, scheduleTasksFilter) => {
    let accountCategoriesFilter = `id in (`;
    scheduleTasks.forEach(st => {
        const acctCategoryId = `${st.masterTask.acctCategoryId},`;
        if(st.masterTask.acctCategoryId && !accountCategoriesFilter.includes(acctCategoryId)) {
            accountCategoriesFilter += acctCategoryId;
        }
    });
    accountCategoriesFilter = accountCategoriesFilter.slice(0, -1) + ')';
    let scheduleVendorAcctCategoryAssocsFilter = scheduleTasksFilter.replace('jobId', 'job/id'); // We can re-use an existing filter, but must fix a bug in OData $filter in ()
    let accountCategoriesQuery = `${apiBaseUrl}/accountCategories?$select=id,name,number,scarStage
        &$expand=scheduleVendorAcctCategoryAssocs(
            $select=jobId,vendorId
            ;$filter=${scheduleVendorAcctCategoryAssocsFilter}
                and
                vendorId eq 2964
        )
        &$filter=${accountCategoriesFilter}`; // vendor id was hard coded in original query
    return await axios.get(accountCategoriesQuery, {
        headers: {
            'Authorization': `basic ${apiKey}`
        },
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // (NOTE: this will disable client verification)
        })
    })
    .then(result => result.data.value)
    .catch(err => {
        console.log(err);
        throw(err);
    });
}

const getFinancialCommunities = async () => {
    let financialComunitiesQuery = `${apiBaseUrl}/financialCommunities?$select=id,name,number&$filter=id in (6772,6773,6774)`; // financialCommunityIds were hard coded in the original query
    return axios.get(financialComunitiesQuery, {
        headers: {
            'Authorization': `basic ${apiKey}`
        },
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // (NOTE: this will disable client verification)
        })
    })
    .then(result => result.data.value)
    .catch(err => {
        console.log(err);
        throw(err);
    });
}

const getJobs = async () => {
    let jobsQuery = `${apiBaseUrl}/jobs?
    $select=id,lotId,planId,constructionStageName,projectedFinalDate,permitNumber
    &$expand=pendingConstructionStages($select=jobId,constructionStageName,constructionStageStartDate)
    &$filter=lotId in (332996,332998,332999,333000,333001,332981,332982,332986,332987,332990,332991,332992,332994,333032,333037,333049,333050,333051,333052,333053,332910,332911,332912,332913,332914,332915,332930,332932,332933,333002,333003,333004,333013,333014,333015,332964,332965,332966,332970,332979,333006,333008,332908,332909,333030,333059,332898,332899,332900,332901,332902,333018,333019,333020,333021,333022,332959,332960,332961,332973,332974,332975,332976,332977,332978,333038,333056,333039,333057,333040,333058,333041,333042,333043,333044,333045,333046,333060,333061,333062,333063,333064,333065,333066,332903,332904,332905,332906,332907)`;
    return axios.get(jobsQuery, {
        headers: {
            'Authorization': `basic ${apiKey}`
        },
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // (NOTE: this will disable client verification)
        })
    })
    .then(result => result.data.value)
    .catch(err => {
        console.log(err);
        throw(err);
    });
}

const getLots = async () => {
    let lotsQuery = `${apiBaseUrl}/lots?
    $select=id,financialCommunityId,lotBlock,streetAddress1
    &$filter=id in (332996,332998,332999,333000,333001,332981,332982,332986,332987,332990,332991,332992,332994,333032,333037,333049,333050,333051,333052,333053,332910,332911,332912,332913,332914,332915,332930,332932,332933,333002,333003,333004,333013,333014,333015,332964,332965,332966,332970,332979,333006,333008,332908,332909,333030,333059,332898,332899,332900,332901,332902,333018,333019,333020,333021,333022,332959,332960,332961,332973,332974,332975,332976,332977,332978,333038,333056,333039,333057,333040,333058,333041,333042,333043,333044,333045,333046,333060,333061,333062,333063,333064,333065,333066,332903,332904,332905,332906,332907)`;
    return axios.get(lotsQuery, {
        headers: {
            'Authorization': `basic ${apiKey}`
        },
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // (NOTE: this will disable client verification)
        })
    })
    .then(result => result.data.value)
    .catch(err => {
        console.log(err);
        throw(err);
    });
}

const getOriginalScheduleTasks = async () => {
    let query = `${apiBaseUrl}/scheduleTasks?
    $select=id,jobId,startDay,duration,floatDays,locked,masterTaskId,paymentTrigger,baselineDate,scheduledStartDate,scheduledCompletionDate,actualCompletionUTCDate,enteredCompletionDate,enteredMultiDayStartDate,enteredMultiDayPaymentTriggerDate,containsCheckList,checklistApproved
    &$expand=
        masterTask(
            $select=id,name,scheduleTypeDescription
            ;$expand=
                acctCategory(
                    $select=id,name,number,scarStage
                    ;$expand=
                        scheduleVendorAcctCategoryAssocs(
                            $select=jobId,vendorId
                            ;$filter=job/lot/id in (332996,332998,332999,333000,333001,332981,332982,332986,332987,332990,332991,332992,332994,333032,333037,333049,333050,333051,333052,333053,332910,332911,332912,332913,332914,332915,332930,332932,332933,333002,333003,333004,333013,333014,333015,332964,332965,332966,332970,332979,333006,333008,332908,332909,333030,333059,332898,332899,332900,332901,332902,333018,333019,333020,333021,333022,332959,332960,332961,332973,332974,332975,332976,332977,332978,333038,333056,333039,333057,333040,333058,333041,333042,333043,333044,333045,333046,333060,333061,333062,333063,333064,333065,333066,332903,332904,332905,332906,332907)
                                and
                                vendor/id in (2964)
                        )
                )
        )
        ,job(
            $select=id,planId,constructionStageName,projectedFinalDate,permitNumber
            ;$expand=
                lot(
                    $select=id,lotBlock,streetAddress1
                    ;$expand=
                        financialCommunity($select=id,name,number)
                )
                ,pendingConstructionStages(
                    $select=jobId,constructionStageName,constructionStageStartDate
                )
                ,planCommunity($select=id,planSalesName)
        )
    &$filter=enteredCompletionDate eq null
        and
        (job/lot/financialCommunity/id in (6772,6773,6774))
        and
        (job/lot/id in (332996,332998,332999,333000,333001,332981,332982,332986,332987,332990,332991,332992,332994,333032,333037,333049,333050,333051,333052,333053,332910,332911,332912,332913,332914,332915,332930,332932,332933,333002,333003,333004,333013,333014,333015,332964,332965,332966,332970,332979,333006,333008,332908,332909,333030,333059,332898,332899,332900,332901,332902,333018,333019,333020,333021,333022,332959,332960,332961,332973,332974,332975,332976,332977,332978,333038,333056,333039,333057,333040,333058,333041,333042,333043,333044,333045,333046,333060,333061,333062,333063,333064,333065,333066,332903,332904,332905,332906,332907))`;
    return axios.get(query, {
        headers: {
            'Authorization': `basic ${apiKey}`
        },
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // (NOTE: this will disable client verification)
        })
    })
    .then(result => result.data.value)
    .catch(err => {
        console.log(err);
        throw(err);
    });    
}

const getPlanCommunities = async (planCommunitiesFilter) => {
    let planCommunitiesQuery = `${apiBaseUrl}/planCommunities?$select=id,planSalesName&$filter=${planCommunitiesFilter}`;
    return axios.get(planCommunitiesQuery, {
        headers: {
            'Authorization': `basic ${apiKey}`
        },
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // (NOTE: this will disable client verification)
        })
    })
    .then(result => result.data.value)
    .catch(err => {
        console.log(err);
        throw(err);
    });
}

const getScheduleTasks = async (scheduleTasksFilter) => {
    let scheduleTasksQuery = `${apiBaseUrl}/scheduleTasks?
    $select=id,jobId,startDay,duration,floatDays,locked,masterTaskId,paymentTrigger,baselineDate,scheduledStartDate,scheduledCompletionDate,actualCompletionUTCDate,enteredCompletionDate,enteredMultiDayStartDate,enteredMultiDayPaymentTriggerDate,containsCheckList,checklistApproved
    &$expand=masterTask($select=id,name,acctCategoryId,scheduleTypeDescription)
    &$filter=${scheduleTasksFilter}`;
    return axios.get(scheduleTasksQuery, {
        headers: {
            'Authorization': `basic ${apiKey}`
        },
        httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false // (NOTE: this will disable client verification)
        })
    })
    .then(result => result.data.value)
    .catch(err => {
        console.log(err);
        throw(err);
    });
}

const handleError = (error) => {
    console.error(error);
    if(method == "immediate") {
        process.exit(1);
    }
}

main();