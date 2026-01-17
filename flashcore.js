const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');


puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

var teamAnalyze = process.argv[2];
var category = process.argv[3];
var country = process.argv[4].split(/\s+/)[0];
var nGamesAnalyze = process.argv[5];

var fileLog = teamAnalyze + '_' + category + '_' + country + '_' + nGamesAnalyze + '_' + getTimestamp() + '.txt';
fileLog = fileLog.replaceAll(' ', '');
console.log(`fileLog   = ${fileLog}`);
console.log(getTimestamp());



// Create a write stream
console.log('✅ Create a write stream');

const logFile = fs.createWriteStream(fileLog, { flags: 'a' });

// Override console.log
const originalLog = console.log;
console.log = function (...args) {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    logFile.write(message + '\n');
    originalLog.apply(console, args);
};


function getTimestamp() {
    const now = new Date();
    return now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/[/,:]/g, '_').replace(/\s/g, '_');
}


async function safeEval(page, fn) {
    for (let i = 0; i < 3; i++) {
        try {
            return await page.evaluate(fn);
        } catch (e) {
            if (e.message.includes('Execution context was destroyed')) {
                await page.waitForTimeout(500); // wait a bit for reload
                continue;
            }
            throw e;
        }
    }
}

function sortArrayAscending(arr) {
    return arr.slice().sort((a, b) => a - b);
}

function normalizeGoalMinutes(vector) {
    // Convert minutes by removing added time notation (+X)
    return vector.map(minute => {
        // Convert to string, split by '+', take first part, convert to number
        return parseInt(minute.toString().split('+')[0]);
    });
}

function calculatePercentageInRange(vector, min, max) {
    // Count how many values are within the range [min, max]
    const countInRange = vector.filter(value => value >= min && value <= max).length;

    // Calculate percentage
    const percentage = (countInRange / vector.length) * 100;

    return percentage.toFixed(2);
}

function calculatePercentageGreaterThan(vector, cornerNumber) {
    // Check if the vector is empty
    if (!vector || vector.length === 0) {
        return 0;
    }

    // Count elements greater than cornerNumber
    const count = vector.filter(value => value > cornerNumber).length;

    // Calculate percentage
    const percentage = (count / vector.length) * 100;

    return percentage.toFixed(2);
}

function calculatePercentageGreaterThanOrEqual(vector, cornerNumber) {
    // Check if the vector is empty
    if (!vector || vector.length === 0) {
        return 0;
    }

    // Count elements greater than cornerNumber
    const count = vector.filter(value => value >= cornerNumber).length;

    // Calculate percentage
    const percentage = (count / vector.length) * 100;

    return percentage.toFixed(2);
}


function calculatePercentageLessThan(vector, cornerNumber) {
    // Check if the vector is empty
    if (!vector || vector.length === 0) {
        return 0;
    }

    // Count elements less than cornerNumber
    const count = vector.filter(value => value < cornerNumber).length;

    // Calculate percentage
    const percentage = (count / vector.length) * 100;

    return percentage.toFixed(2);
}


function calculatePercentage(vector, operator, message) {

    console.log(' '.repeat(60));
    console.log('-'.repeat(60));
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log(message);
    console.log(' '.repeat(60));

    for (let i = 0; i <= 30; i++) {

        let result = null;
        if (operator === '<') {
            result = calculatePercentageLessThan(vector, i);
        }

        if (operator === '>') {
            result = calculatePercentageGreaterThan(vector, i);
        }
        // var result = calculatePercentageGreaterThan(vecTotalCorners, 0);


        if (i < 10) {
            console.log(`${message} ${i}   : ${result}%`);
        }
        else {
            console.log(`${message} ${i}  : ${result}%`);
        }

    }
}



function calculatePercentageResult(vector, result) {
    // Check if the vector is empty
    if (!vector || vector.length === 0) {
        return 0;
    }

    // Count elements equals to result
    const count = vector.filter(value => value == result).length;

    // Calculate percentage
    const percentage = (count / vector.length) * 100;

    return percentage.toFixed(2);
}

function calculateAverage(vector) {
    if (!Array.isArray(vector)) {
        throw new TypeError("Parameter must be an array");
    }

    if (vector.length === 0) {
        return 0;
    }

    const validNumbers = vector.filter(num =>
        typeof num === 'number' && !isNaN(num) && isFinite(num)
    );

    if (validNumbers.length === 0) {
        return 0;
    }

    const sum = validNumbers.reduce((acc, val) => acc + val, 0);
    return (sum / validNumbers.length).toFixed(2);
}


async function setSearchInput(page, text) {
    try {
        // Wait for and locate the input element
        const input = await page.waitForSelector('.searchInput__input', { state: 'attached' });

        // Focus the element
        await input.focus();

        // Type the new text (simulates real typing)
        await input.type(text, { delay: 50 }); // 50ms between keystrokes

        // Alternative: Direct value setting (faster but less realistic)
        // await input.fill(text);

        console.log(`Successfully set search value to: "${text}"`);
        return true;
    } catch (error) {
        console.error('Error setting search input:', error);
        return false;
    }
}



async function getMatchData(page) {
    try {

        console.log('BEGIN - Extract getMatchData');

        // Extract data
        const matchData = await page.evaluate(() => {
            const timeElement = document.querySelector('.duelParticipant__startTime div');
            const homeTeamElement = document.querySelector('.duelParticipant__home .participant__participantName a');
            const awayTeamElement = document.querySelector('.duelParticipant__away .participant__participantName a');
            const scoreElement = document.querySelector('.detailScore__wrapper');

            return {
                time: timeElement?.textContent.trim() || 'N/A',
                homeTeam: homeTeamElement?.textContent.trim() || 'N/A',
                awayTeam: awayTeamElement?.textContent.trim() || 'N/A',
                score: scoreElement?.textContent.trim().replace(/\s+/g, '') || 'N/A', // "3-0"
                homeScore: scoreElement?.textContent.trim().replace(/\s+/g, '').split('-')[0] || 'N/A', // "3-0"
                awayScore: scoreElement?.textContent.trim().replace(/\s+/g, '').split('-')[1] || 'N/A', // "3-0"
                status: document.querySelector('.detailScore__status span')?.textContent.trim() || 'N/A' // "Finished"
            };
        });

        console.log('END - Extract getMatchData');



        return matchData;
    } catch (error) {
        console.error('Error setting search input:', error);
        return null;
    }
}


async function getSummaryGoalsMinutes(page, goals = 'ALL') {
    try {
        console.log('BEGIN - Extract getSummaryGoalsMinutes');

        const goalsScored = await page.evaluate((goalsParam) => {
            const selectorMap = {
                'ALL': ".smv__incidentHomeScore, .smv__incidentAwayScore",
                'HOME': ".smv__incidentHomeScore",
                'AWAY': ".smv__incidentAwayScore"
            };

            const selector = selectorMap[goalsParam] || selectorMap['ALL'];
            const allIncidents = document.querySelectorAll(".smv__incident") || [];

            const goalEvents = [...allIncidents]
                .filter(ev => ev.querySelector(selector));

            return goalEvents.map(ev => {
                const time = ev.querySelector(".smv__timeBox")?.innerText.trim();
                return time ? time.replace("'", "") : "";
            });

        }, goals);

        // Return as array (even if undefined or null)
        const result = Array.isArray(goalsScored) ? goalsScored : [];

        // console.log(`GoalsScored: ${JSON.stringify(result)} (length: ${result.length})`);
        console.log('END - Extract getSummaryGoalsMinutes');

        return result;

    } catch (error) {
        console.error('Error getSummaryGoalsMinutes:', error);
        return []; // Always return array
    }
}

async function getStatistics(page) {
    try {

        console.log('BEGIN - Extract all statistics rows');

        // Extract all statistics rows
        const stats = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.wcl-row_2oCpS[data-testid="wcl-statistics"]'));
            return rows.map(row => {


                // Extract home and away values
                const homeValue = row.querySelector('.wcl-homeValue_3Q-7P strong')?.textContent.trim() || '';
                const awayValue = row.querySelector('.wcl-awayValue_Y-QR1 strong')?.textContent.trim() || '';

                // Extract category name
                const category = row.querySelector('.wcl-category_6sT1J strong')?.textContent.trim() || '';

                // Extract percentage widths from charts
                const homePercentage = parseInt(row.querySelector('.wcl-chart_-31bu.wcl-home_yQ91A div')?.style.width) || 0;
                const awayPercentage = parseInt(row.querySelector('.wcl-chart_-31bu:not(.wcl-home_yQ91A) div')?.style.width) || 0;

                // For passes, include the raw counts if available
                let homeRaw = '', awayRaw = '';
                if (category === 'Passes') {
                    homeRaw = row.querySelector('.wcl-homeValue_3Q-7P span')?.textContent.trim() || '';
                    awayRaw = row.querySelector('.wcl-awayValue_Y-QR1 span')?.textContent.trim() || '';
                }

                return {
                    name: category,
                    time: null,
                    homeTeam: null,
                    awayTeam: null,
                    homeScore: null,
                    awayScore: null,
                    home: homeValue,
                    away: awayValue,
                    homePercentage: homePercentage,
                    awayPercentage: awayPercentage,
                    ...(category === 'Passes' && {
                        homeRaw: homeRaw,
                        awayRaw: awayRaw
                    })
                };
            });
        });
        console.log('END - Extract all statistics rows');

        return stats;
    } catch (error) {
        console.error('Error setting search input:', error);
        return null;
    }
}


//------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------

// Function to extract statistics data from the DOM
// async function extractMatchStats(page) {

//     try {

//         const statsData = await page.evaluate(() => {
//             const sections = document.querySelectorAll('.section');
//             const statsData = {};

//             sections.forEach(section => {
//                 // Get the section title
//                 const sectionTitle = section.querySelector('.sectionHeader').textContent.trim();

//                 // Get all stat rows in this section
//                 const statRows = section.querySelectorAll('[data-testid="wcl-statistics"]');
//                 const sectionData = [];

//                 statRows.forEach(row => {
//                     // Extract stat name
//                     const statNameElement = row.querySelector('[data-testid="wcl-statistics-category"] span.wcl-bold_NZXv6');
//                     const statName = statNameElement ? statNameElement.textContent.trim() : '';

//                     // Extract home and away values
//                     const homeValueElement = row.querySelector('.wcl-homeValue_3Q-7P [data-testid="wcl-scores-simple-text-01"]');
//                     const awayValueElement = row.querySelector('.wcl-awayValue_Y-QR1 [data-testid="wcl-scores-simple-text-01"]');

//                     // Handle cases where there might be multiple spans (like in passes: "87%" and "(479/552)")
//                     const homeSpans = row.querySelectorAll('.wcl-homeValue_3Q-7P [data-testid="wcl-scores-simple-text-01"]');
//                     const awaySpans = row.querySelectorAll('.wcl-awayValue_Y-QR1 [data-testid="wcl-scores-simple-text-01"]');

//                     let homeValue = '';
//                     let awayValue = '';

//                     if (homeSpans.length > 0) {
//                         homeValue = Array.from(homeSpans).map(span => span.textContent.trim()).join(' ');
//                     }

//                     if (awaySpans.length > 0) {
//                         awayValue = Array.from(awaySpans).map(span => span.textContent.trim()).join(' ');
//                     }

//                     // Extract chart percentages if available
//                     const homeChart = row.querySelector('[data-testid="wcl-statistics-chart-home"]');
//                     const awayChart = row.querySelector('[data-testid="wcl-statistics-chart-away"]');

//                     const homePercentage = homeChart ? homeChart.style.width : '0%';
//                     const awayPercentage = awayChart ? awayChart.style.width : '0%';

//                     sectionData.push({
//                         statName: statName,
//                         homeValue: homeValue,
//                         awayValue: awayValue,
//                         homePercentage: homePercentage,
//                         awayPercentage: awayPercentage
//                     });
//                 });

//                 // Only add section if it has data
//                 if (sectionData.length > 0) {
//                     statsData[sectionTitle] = sectionData;
//                 }
//             });

//             return statsData;
//         });
//         return statsData;

//     } catch (error) {
//         console.error('Error in extractMatchStats:', error);
//         return { error: error.message };
//     }

// }

async function extractMatchStats(page) {
    try {
        // Wait for the necessary elements to be present
        await page.waitForSelector('.section', { timeout: 10000 }).catch(() => {
            console.log('Warning: .section elements not found within timeout');
        });

        const statsData = await page.evaluate(() => {
            const sections = document.querySelectorAll('.section');
            const statsData = {};

            // Debug: log how many sections were found
            console.log(`Found ${sections.length} sections`);

            sections.forEach((section, sectionIndex) => {
                try {
                    // Get the section title - with null check
                    const sectionHeader = section.querySelector('.sectionHeader');
                    if (!sectionHeader) {
                        console.log(`Section ${sectionIndex}: No .sectionHeader found`);
                        return; // Skip this section
                    }

                    const sectionTitle = sectionHeader.textContent.trim();
                    if (!sectionTitle) {
                        console.log(`Section ${sectionIndex}: Empty title`);
                        return; // Skip this section
                    }

                    console.log(`Processing section: "${sectionTitle}"`);

                    // Get all stat rows in this section
                    const statRows = section.querySelectorAll('[data-testid="wcl-statistics"]');
                    console.log(`Found ${statRows.length} stat rows in section "${sectionTitle}"`);

                    const sectionData = [];

                    statRows.forEach((row, rowIndex) => {
                        try {
                            // Extract stat name
                            const statNameElement = row.querySelector('[data-testid="wcl-statistics-category"] span.wcl-bold_NZXv6');
                            const statName = statNameElement ? statNameElement.textContent.trim() : '';

                            // Handle cases where there might be multiple spans (like in passes: "87%" and "(479/552)")
                            const homeSpans = row.querySelectorAll('.wcl-homeValue_3Q-7P [data-testid="wcl-scores-simple-text-01"]');
                            const awaySpans = row.querySelectorAll('.wcl-awayValue_Y-QR1 [data-testid="wcl-scores-simple-text-01"]');

                            let homeValue = '';
                            let awayValue = '';

                            if (homeSpans.length > 0) {
                                homeValue = Array.from(homeSpans).map(span => span.textContent.trim()).join(' ');
                            }

                            if (awaySpans.length > 0) {
                                awayValue = Array.from(awaySpans).map(span => span.textContent.trim()).join(' ');
                            }

                            // Extract chart percentages if available
                            const homeChart = row.querySelector('[data-testid="wcl-statistics-chart-home"]');
                            const awayChart = row.querySelector('[data-testid="wcl-statistics-chart-away"]');

                            const homePercentage = homeChart ? homeChart.style.width : '0%';
                            const awayPercentage = awayChart ? awayChart.style.width : '0%';

                            // Only add if we have at least a stat name or values
                            if (statName || homeValue || awayValue) {
                                sectionData.push({
                                    statName: statName,
                                    homeValue: homeValue,
                                    awayValue: awayValue,
                                    homePercentage: homePercentage,
                                    awayPercentage: awayPercentage
                                });
                            }
                        } catch (rowError) {
                            console.error(`Error processing row ${rowIndex} in section "${sectionTitle}":`, rowError);
                            // Continue with next row
                        }
                    });

                    // Only add section if it has data
                    if (sectionData.length > 0) {
                        statsData[sectionTitle] = sectionData;
                        console.log(`Added section "${sectionTitle}" with ${sectionData.length} stats`);
                    } else {
                        console.log(`Section "${sectionTitle}" has no valid data, skipping`);
                    }
                } catch (sectionError) {
                    console.error(`Error processing section ${sectionIndex}:`, sectionError);
                    // Continue with next section
                }
            });

            console.log(`Extracted data from ${Object.keys(statsData).length} sections`);
            return statsData;
        });

        return statsData;

    } catch (error) {
        console.error('Error in extractMatchStats:', error);
        // Optional: Take a screenshot for debugging
        try {
            await page.screenshot({ path: 'error-debug.png' });
        } catch (screenshotError) {
            console.error('Could not take screenshot:', screenshotError);
        }
        return { error: error.message };
    }
}


async function extractMatchStatus(page) {
    try {
        const matchData = await page.evaluate(() => {
            const container = document.querySelector('.duelParticipant__container');
            if (!container) return null;

            // Extract date and time
            const dateTimeElement = container.querySelector('.duelParticipant__startTime div');
            const dateTime = dateTimeElement ? dateTimeElement.textContent.trim() : '';

            // Extract home team
            const homeTeamElement = container.querySelector('.duelParticipant__home');
            const homeTeam = {
                name: homeTeamElement ? homeTeamElement.querySelector('.participant__participantName a').textContent.trim() : '',
                image: homeTeamElement ? homeTeamElement.querySelector('.participant__image').src : '',
                isWinner: homeTeamElement ? homeTeamElement.classList.contains('duelParticipant--winner') : false
            };

            // Extract away team
            const awayTeamElement = container.querySelector('.duelParticipant__away');
            const awayTeam = {
                name: awayTeamElement ? awayTeamElement.querySelector('.participant__participantName a').textContent.trim() : '',
                image: awayTeamElement ? awayTeamElement.querySelector('.participant__image').src : '',
                isWinner: awayTeamElement ? awayTeamElement.classList.contains('duelParticipant--winner') : false
            };

            // Extract score
            const scoreWrapper = container.querySelector('.detailScore__wrapper');
            let homeScore = '';
            let awayScore = '';

            if (scoreWrapper) {
                const scores = scoreWrapper.querySelectorAll('span');
                if (scores.length >= 3) {
                    homeScore = scores[0].textContent.trim();
                    awayScore = scores[2].textContent.trim();
                }
            }

            // Extract status
            const statusElement = container.querySelector('.fixedHeaderDuel__detailStatus');
            const matchStatus = statusElement ? statusElement.textContent.trim() : '';

            return {
                dateTime: dateTime,
                homeTeam: homeTeam.name,
                awayTeam: awayTeam.name,
                homeImage: homeTeam.image,
                awayImage: awayTeam.image,
                homeWinner: homeTeam.isWinner,
                awayWinner: awayTeam.isWinner,
                score: `${homeScore}-${awayScore}`,
                homeScore: homeScore,
                awayScore: awayScore,
                status: matchStatus
            };
        });

        // console.log(matchData);

        return matchData;

    } catch (error) {
        console.error('Error in extractMatchStatus:', error);
        // Optional: Take a screenshot for debugging
        try {
            await page.screenshot({ path: 'error-debug.png' });
        } catch (screenshotError) {
            console.error('Could not take screenshot:', screenshotError);
        }
        return { error: error.message };
    }
}


// Function to format the data in a more readable way
function formatStatsData(statsData) {
    const formattedData = {
        matchStats: {}
    };

    for (const [section, stats] of Object.entries(statsData)) {
        formattedData.matchStats[section] = {
            items: stats
        };
    }

    return formattedData;
}

// Function to convert to CSV format
function convertToCSV(statsData) {
    let csv = 'Section,Stat Name,Home Value,Away Value,Home Percentage,Away Percentage\n';

    for (const [section, stats] of Object.entries(statsData)) {
        stats.forEach(stat => {
            csv += `"${section}","${stat.statName}","${stat.homeValue}","${stat.awayValue}","${stat.homePercentage}","${stat.awayPercentage}"\n`;
        });
    }

    return csv;
}

// Function to convert to array format
function convertToArray(statsData) {
    const result = [];

    for (const [section, stats] of Object.entries(statsData)) {
        stats.forEach(stat => {
            result.push({
                section: section,
                ...stat
            });
        });
    }

    return result;
}

// Main extraction function
function extractAllStats() {
    try {
        const rawStats = extractMatchStats();
        const formattedStats = formatStatsData(rawStats);
        const csvData = convertToCSV(rawStats);
        const arrayData = convertToArray(rawStats);

        return {
            raw: rawStats,
            formatted: formattedStats,
            csv: csvData,
            array: arrayData
        };
    } catch (error) {
        console.error('Error extracting stats:', error);
        return null;
    }
}






//------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------



async function getListTeams(page) {
    try {

        console.log('BEGIN - Get list teams');

        // Wait for the search results to load
        await page.waitForSelector('.searchResult');

        // Extract data from all search results
        const extractedData = await page.$$eval('.searchResult', results => {
            return results.map(result => {
                const nameElement = result.querySelector('.searchResult__participantName');
                const imageElement = result.querySelector('.searchResult__participantImage');
                const categoryElement = result.querySelector('.searchResult__participantCategory');
                const flagElement = result.querySelector('.searchResult__participantFlag');

                return {
                    name: nameElement ? nameElement.textContent.trim() : '',
                    imageUrl: imageElement ? imageElement.src : '',
                    category: categoryElement ? categoryElement.textContent.trim() : '',
                    link: result.href,
                    flag: flagElement ? flagElement.title : '',
                    hasStar: result.querySelector('.eventSubscriber__star') !== null
                };
            });
        });
        console.log('END - Get list teams');
        // console.log(extractedData);
        return extractedData;
    } catch (error) {
        console.error('Get list teams :', error);
        return null;
    }
}


async function extractSearchResultsWithPuppeteer(page) {
    return await page.$$eval('.searchResult', results => {
        return results.map(result => {
            const nameElement = result.querySelector('.searchResult__participantName');
            const imageElement = result.querySelector('.searchResult__participantImage');
            const categoryElement = result.querySelector('.searchResult__participantCategory');
            const flagElement = result.querySelector('.searchResult__participantFlag');

            // Extract name (remove flag span if present)
            let name = nameElement ? nameElement.textContent.trim() : '';
            const flagSpan = nameElement ? nameElement.querySelector('.searchResult__participantFlag') : null;
            if (flagSpan) {
                name = name.replace(flagSpan.outerHTML, '').trim();
            }

            // Extract image URL
            let imageUrl = '';
            if (imageElement && imageElement.src) {
                imageUrl = imageElement.src;
            } else {
                const svgElement = result.querySelector('svg');
                if (svgElement) {
                    if (svgElement.classList.contains('player-man')) {
                        imageUrl = 'player-man-placeholder';
                    } else if (svgElement.classList.contains('player-woman')) {
                        imageUrl = 'player-woman-placeholder';
                    }
                }
            }

            return {
                name: name,
                imageUrl: imageUrl,
                category: categoryElement ? categoryElement.textContent.trim() : '',
                link: result.href,
                flag: flagElement ? flagElement.title : '',
                hasStar: result.querySelector('.eventSubscriber__star') !== null
            };
        });
    });
}


function safeIsSubstring(mainStr, subStr) {
    // Handle null/undefined values
    if (mainStr == null || subStr == null) return false;

    // Convert to string if not already
    mainStr = String(mainStr);
    subStr = String(subStr);

    return mainStr.includes(subStr);
}


function filterTeam(data, name, category, country) {

    var teams = data.filter(item =>
        // safeIsSubstring(item.name, name) &&
        item.name === name &&
        safeIsSubstring(item.category, category) &&
        safeIsSubstring(item.category, country)
    );

    // teams = teams.find(team => team.name === name);

    return teams;
}


(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Set to true to run headless
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        await page.goto('https://www.flashscore.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('✅ Successfully loaded https://www.flashscore.com/');
    } catch (error) {
        console.error('❌ Failed to load https://www.flashscore.com:', error.message);
        process.exit(0);
    }


    console.log("✅ Click on 'Reject All' cookies");


    await page.waitForSelector("#onetrust-reject-all-handler", {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    await page.click("#onetrust-reject-all-handler")


    await page.click('.searchIcon');

    console.log(`teamAnalyze   = ${teamAnalyze}`);
    console.log(`category      = ${category}`);
    console.log(`country       = ${country}`);
    console.log(`nGamesAnalyze = ${nGamesAnalyze}`);


    await setSearchInput(page, teamAnalyze);
    console.log('50');
    var extractedData = await getListTeams(page);
    await delay(2000);
    // console.log(`extractedData = ${extractedData}`);
    // console.log('extractedData = ', extractedData);


    // Usage examples:
    const exactResults = filterTeam(extractedData, teamAnalyze, category, country);
    // console.log('exactResults = ', exactResults);


    await page.waitForSelector('.searchResult__participantName');
    teamAnalyze = await page.$eval('.searchResult__participantName', el => el.textContent);
    console.log(`teamAnalyze = ${teamAnalyze}`);

    teamAnalyze = exactResults[0].name;
    console.log(`teamAnalyze = ${teamAnalyze}`);

    try {
        await page.goto(exactResults[0].link, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('✅ Successfully loaded ' + exactResults[0].link);
    } catch (error) {
        console.error('❌ Failed to load :' + exactResults[0].link, error.message);
    }



    var stats = null;
    var matchData = null;
    var vecTmpGoals = [];
    var vecAllGoalsMinutes = [];
    var vecGoalsFavorMinutes = [];
    var vecGoalsAgainstMinutesData = [];

    var totalCornersFavor = 0;
    var totalCornersAgainst = 0;
    var totalCorners = 0;
    var mediaCornersFavor = 0;
    var mediaCornersAgainst = 0;
    var mediaCorners = 0;

    var totalGoalsFavor = 0;
    var totalGoalsAgainst = 0;
    var totalGoals = 0;

    var totalShotsFavor = 0;
    var totalShotsAgainst = 0;


    var mediaTotalShotsTargetFavor = 0;
    var mediaTotalShotsTargetAgainst = 0;
    var mediaTotalShotsTarget = 0;

    var mediaGoalsFavor = 0;
    var mediaGoalsAgainst = 0;
    var mediaGoals = 0;
    var mediaTotalShotsFavor = 0;
    var mediaTotalShotsAgainst = 0;
    var mediaTotalShots = 0;

    var totalShots = 0;
    var totalShotsTarget = 0;


    var vecTotalCornersFavor = [];
    var vecTotalCornersAgainst = [];
    var vecTotalCorners = [];
    var vecCornersResult = [];

    var vecTotalGoalsFavor = [];
    var vecTotalGoalsAgainst = [];
    var vecTotalGoals = [];
    var vecGoalsResult = [];

    var vecTotalShotsFavor = [];
    var vecTotalShotAgainst = [];
    var vecTotalShots = [];

    var vecShotsTargetFavor = [];
    var vecShotsTargetAgainst = [];
    var vecTotalShotsTarget = [];

    // Both teams to score vector
    var vecBTTS = [];

    vecTime = [];
    vecHomeTeam = [];
    vecAwayTeam = [];
    vecHomeScore = [];
    vecAwayScore = [];

    var nFailedAnalyses = 0;

    console.log(`totalCornersFavor = ${totalCornersFavor}`);


    var newUrl = null;

    for (let i = 0; i < nGamesAnalyze; i++) {


        // Get the current URL
        // Get the new URL
        if (i == 0) {
            newUrl = await page.url();
        }

        console.log('✅ URL after click:', newUrl);

        const newUrlResults = newUrl + 'results/'

        console.log(`newUrlResults = ${newUrlResults}`);

        console.log('✅ Click Results tab:');
        console.log('100');

        // await page.waitForSelector('#li2');
        await page.goto(newUrlResults, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // await delay(5000);

        console.log('200');
        // await page.click('#li2');
        console.log('300');


        // Wait for matches to load
        await page.waitForSelector('[id^="g_1_"]');
        console.log('400');
        // Get all match elements
        var matchElements = await page.$$('[id^="g_1_"]');
        console.log('500');
        console.log(`Found ${matchElements.length} matches to click`);

        console.log('600');


        console.log('i = ', i);
        console.log('1000');
        matchElements[i].click();
        console.log('2000');

        console.log('2500');
        await delay(2000);
        console.log('3000');

        // Get all match elements
        console.log('✅ Get all match elements');
        var matchElementsShowMore = await page.$$('span[data-testid="wcl-scores-caption-05"]');
        console.log('4000');

        if (matchElementsShowMore.length < 1) {
            // nFailedAnalyses++;
            continue;
        }


        //----------------------------------------------------------------
        //----------------------------------------------------------------


        console.log('4500');
        console.log('✅ Get Summary report (goals minute)');

        vecTmpGoals = await getSummaryGoalsMinutes(page, 'ALL');
        vecAllGoalsMinutes = vecAllGoalsMinutes.concat(vecTmpGoals);


        vecTmpGoals = await getSummaryGoalsMinutes(page, 'HOME');
        vecGoalsFavorMinutes = vecGoalsFavorMinutes.concat(vecTmpGoals);


        vecTmpGoals = await getSummaryGoalsMinutes(page, 'AWAY');
        vecGoalsAgainstMinutesData = vecGoalsAgainstMinutesData.concat(vecTmpGoals);


        //----------------------------------------------------------------
        //----------------------------------------------------------------

        console.log(`Found ${matchElementsShowMore.length} matchElementsShowMore to click`);
        console.log('✅ Click "Show more>"');
        await delay(1500);

        matchElementsShowMore[matchElementsShowMore.length - 1].click()
        console.log('5000');
        await delay(1000);
        console.log('6000');


        // matchData = await getMatchData(page);
        console.log('6500');
        // console.log('matchData = ', matchData);


        stats = await getStatistics(page);

        var matchStatus = await extractMatchStatus(page);
        // console.log('matchStatus = ', matchStatus);
        // console.log('matchStatus.dateTime = ', matchStatus.dateTime);
        // console.log('matchStatus.homeTeam = ', matchStatus.homeTeam);
        // console.log('matchStatus.awayTeam = ', matchStatus.awayTeam);
        // console.log('matchStatus.homeScore = ', matchStatus.homeScore);
        // console.log('matchStatus.awayScore = ', matchStatus.awayScore);

        stats = await extractMatchStats(page)
        // console.log('stats = ', stats);

        const topStats = stats["Top stats"];
        // console.log('topStats = ', topStats);

        if (!topStats) {
            console.log('topStats is falsy (undefined, null, empty, etc.)');
            // Handle the case
            continue;
        }


        let cornersFavor = 0;
        let cornersAgainst = 0;
        let goalsFavor = 0;
        let goalsAgainst = 0;

        let totalShotsFavor = 0;
        let totalShotsAgainst = 0;
        let shotsTargetFavor = 0;
        let shotsTargetAgainst = 0;


        for (let j = 0; j < topStats.length; j++) {

            if (topStats[j].statName === 'Corner kicks') {
                console.log(`topStats[${j}].statName   = ${topStats[j].statName}`);
                console.log(`topStats[${j}].homeValue  = ${topStats[j].homeValue}`);
                console.log(`topStats[${j}].awayValue  = ${topStats[j].awayValue}`);
                cornersFavor = parseInt(topStats[j].homeValue);
                cornersAgainst = parseInt(topStats[j].awayValue);
            }

            if (topStats[j].statName === 'Total shots') {
                console.log(`topStats[${j}].statName   = ${topStats[j].statName}`);
                console.log(`topStats[${j}].homeValue  = ${topStats[j].homeValue}`);
                console.log(`topStats[${j}].awayValue  = ${topStats[j].awayValue}`);
                totalShotsFavor = parseInt(topStats[j].homeValue);
                totalShotsAgainst = parseInt(topStats[j].awayValue);
            }

            if (topStats[j].statName === 'Shots on target') {
                console.log(`topStats[${j}].statName   = ${topStats[j].statName}`);
                console.log(`topStats[${j}].homeValue  = ${topStats[j].homeValue}`);
                console.log(`topStats[${j}].awayValue  = ${topStats[j].awayValue}`);
                shotsTargetFavor = parseInt(topStats[j].homeValue);
                shotsTargetAgainst = parseInt(topStats[j].awayValue);
            }
        }

        goalsFavor = parseInt(matchStatus.homeScore);
        goalsAgainst = parseInt(matchStatus.awayScore);

        totalCornersFavor += cornersFavor;
        totalCornersAgainst += cornersAgainst;
        totalCorners += cornersFavor + cornersAgainst;

        totalGoalsFavor += goalsFavor;
        totalGoalsAgainst += goalsAgainst;
        totalGoals += goalsFavor + goalsAgainst

        // totalShotsFavor += totalShotsFavor;
        // totalShotsAgainst += totalShotsAgainst;
        totalShots += totalShotsFavor + totalShotsAgainst

        // shotsTargetFavor += shotsTargetFavor;
        // shotsTargetAgainst += shotsTargetAgainst;
        totalShotsTarget += shotsTargetFavor + shotsTargetAgainst

        // console.log(`totalCornersFavor   = ${totalCornersFavor}`);
        // console.log(`totalCornersAgainst = ${totalCornersAgainst}`);
        // console.log(`cornersFavor        = ${cornersFavor}`);
        // console.log(`cornersAgainst      = ${cornersAgainst}`);
        // console.log(`totalCorners        = ${totalCorners}`);
        // console.log('                                            ');
        // console.log(`totalGoalsFavor     = ${totalGoalsFavor}`);
        // console.log(`totalGoalsAgainst   = ${totalGoalsAgainst}`);
        // console.log(`goalsFavor          = ${goalsFavor}`);
        // console.log(`goalsAgainst        = ${goalsAgainst}`);
        // console.log(`totalGoals          = ${totalGoals}`);
        // console.log('                                            ');
        // console.log(`totalShotsFavor     = ${totalShotsFavor}`);
        // console.log(`totalShotsAgainst   = ${totalShotsAgainst}`);
        // console.log(`totalShots          = ${totalShots}`);
        // console.log('                                            ');
        // console.log(`shotsTargetFavor    = ${shotsTargetFavor}`);
        // console.log(`shotsTargetAgainst  = ${shotsTargetAgainst}`);
        // console.log(`totalShotsTarget    = ${totalShotsTarget}`);


        if (matchStatus.homeTeam === teamAnalyze) {

            vecTotalCornersFavor.push(cornersFavor)
            vecTotalCornersAgainst.push(cornersAgainst)

            vecTotalGoalsFavor.push(goalsFavor)
            vecTotalGoalsAgainst.push(goalsAgainst)

            vecTotalShotsFavor.push(totalShotsFavor)
            vecTotalShotAgainst.push(totalShotsAgainst)

            vecShotsTargetFavor.push(shotsTargetFavor)
            vecShotsTargetAgainst.push(shotsTargetAgainst)
        }
        else {

            vecTotalCornersFavor.push(cornersAgainst)
            vecTotalCornersAgainst.push(cornersFavor)

            vecTotalGoalsFavor.push(goalsAgainst)
            vecTotalGoalsAgainst.push(goalsFavor)

            vecTotalShotsFavor.push(totalShotsAgainst)
            vecTotalShotAgainst.push(totalShotsFavor)

            vecShotsTargetFavor.push(shotsTargetAgainst)
            vecShotsTargetAgainst.push(shotsTargetFavor)
        }


        vecTotalCorners.push(cornersFavor + cornersAgainst)
        vecTotalGoals.push(goalsFavor + goalsAgainst)
        vecTotalShots.push(totalShotsFavor + totalShotsAgainst)
        vecTotalShotsTarget.push(shotsTargetFavor + shotsTargetAgainst)

        vecTime.push(matchStatus.dateTime);
        vecHomeTeam.push(matchStatus.homeTeam);
        vecAwayTeam.push(matchStatus.awayTeam);
        vecHomeScore.push(matchStatus.homeScore);
        vecAwayScore.push(matchStatus.awayScore);

        //         console.log('matchStatus.dateTime = ', matchStatus.dateTime);
        // console.log('matchStatus.homeTeam = ', matchStatus.homeTeam);
        // console.log('matchStatus.awayTeam = ', matchStatus.awayTeam);
        // console.log('matchStatus.homeScore = ', matchStatus.homeScore);
        // console.log('matchStatus.awayScore = ', matchStatus.awayScore);


        // if (cornersFavor > cornersAgainst) {
        //     vecCornersResult.push('V')

        // }
        // else if (cornersFavor === cornersAgainst) {
        //     vecCornersResult.push('D')
        // }
        // else {
        //     vecCornersResult.push('L')
        // }

        if (vecTotalCornersFavor[i] > vecTotalCornersAgainst[i]) {
            vecCornersResult.push('V')
        }
        else if (vecTotalCornersFavor[i] === vecTotalCornersAgainst[i]) {
            vecCornersResult.push('D')
        }
        else {
            vecCornersResult.push('L')
        }
        //----------------------------------------------------------                
        // if (goalsFavor > goalsAgainst) {
        //     vecGoalsResult.push('V')

        // }
        // else if (goalsFavor === goalsAgainst) {
        //     vecGoalsResult.push('D')
        // }
        // else {
        //     vecGoalsResult.push('L')
        // }

        if (vecTotalGoalsFavor[i] > vecTotalGoalsAgainst[i]) {
            vecGoalsResult.push('V')
        }
        else if (vecTotalGoalsFavor[i] === vecTotalGoalsAgainst[i]) {
            vecGoalsResult.push('D')
        }
        else {
            vecGoalsResult.push('L')
        }


        //         vecTotalGoalsFavor.push(goalsFavor)
        // vecTotalGoalsAgainst.push(goalsAgainst)

        //----------------------------------------------------------

        // BTTS calcule
        if (goalsFavor > 0 && goalsAgainst > 0) {
            vecBTTS.push(1)

        }
        else {
            vecBTTS.push(0)
        }


        console.log('7000');

        console.log('✅ Back to list of games');

        console.log(`newUrl   = ${newUrl}`);
        await page.goto(newUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });


        console.log('7500');

        // Do something else in parallel...
        console.log('7600');
        // Later, if you need to wait:
        // await navigationPromise;


        console.log('8000');
        await delay(2000);

    }

    // console.log('                                                  ');
    // console.log('--------------------------------------------------');
    // console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    // console.log('✅ Calculate Corner Percentage Greater Than .... :');
    // console.log('                                                  ');

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 0);
    // console.log(`✅ Percentage of corners greater than 0  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 1);
    // console.log(`✅ Percentage of corners greater than 1  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 2);
    // console.log(`✅ Percentage of corners greater than 2  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 3);
    // console.log(`✅ Percentage of corners greater than 3  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 4);
    // console.log(`✅ Percentage of corners greater than 4  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 5);
    // console.log(`✅ Percentage of corners greater than 5  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 6);
    // console.log(`✅ Percentage of corners greater than 6  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 7);
    // console.log(`✅ Percentage of corners greater than 7  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 8);
    // console.log(`✅ Percentage of corners greater than 8  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 9);
    // console.log(`✅ Percentage of corners greater than 9  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 10);
    // console.log(`✅ Percentage of corners greater than 10 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 11);
    // console.log(`✅ Percentage of corners greater than 11 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 12);
    // console.log(`✅ Percentage of corners greater than 12 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 13);
    // console.log(`✅ Percentage of corners greater than 13 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 14);
    // console.log(`✅ Percentage of corners greater than 14 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 15);
    // console.log(`✅ Percentage of corners greater than 15 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 16);
    // console.log(`✅ Percentage of corners greater than 16 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 17);
    // console.log(`✅ Percentage of corners greater than 17 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 18);
    // console.log(`✅ Percentage of corners greater than 18 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 19);
    // console.log(`✅ Percentage of corners greater than 19 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCorners, 20);
    // console.log(`✅ Percentage of corners greater than 20 : ${result}%`);

    // calculatePercentage(vecTotalCorners, '>', '✅ Percentage of total corners greater than');

    // console.log('                                               ');
    // console.log('-----------------------------------------------');
    // console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    // console.log('✅ Calculate Corner Percentage Less Than .... :');
    // console.log('                                               ');


    // calculatePercentage(vecTotalCorners, '<', '✅ Percentage of total corners less than')

    // var result = calculatePercentageLessThan(vecTotalCorners, 1);
    // console.log(`✅ Percentage of corners less than 1  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 2);
    // console.log(`✅ Percentage of corners less than 2  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 3);
    // console.log(`✅ Percentage of corners less than 3  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 4);
    // console.log(`✅ Percentage of corners less than 4  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 5);
    // console.log(`✅ Percentage of corners less than 5  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 6);
    // console.log(`✅ Percentage of corners less than 6  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 7);
    // console.log(`✅ Percentage of corners less than 7  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 8);
    // console.log(`✅ Percentage of corners less than 8  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 9);
    // console.log(`✅ Percentage of corners less than 9  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 10);
    // console.log(`✅ Percentage of corners less than 10 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 11);
    // console.log(`✅ Percentage of corners less than 11 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 12);
    // console.log(`✅ Percentage of corners less than 12 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 13);
    // console.log(`✅ Percentage of corners less than 13 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 14);
    // console.log(`✅ Percentage of corners less than 14 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 15);
    // console.log(`✅ Percentage of corners less than 15 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 16);
    // console.log(`✅ Percentage of corners less than 16 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 17);
    // console.log(`✅ Percentage of corners less than 17 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 18);
    // console.log(`✅ Percentage of corners less than 18 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 19);
    // console.log(`✅ Percentage of corners less than 19 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 20);
    // console.log(`✅ Percentage of corners less than 20 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 21);
    // console.log(`✅ Percentage of corners less than 21 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalCorners, 22);
    // console.log(`✅ Percentage of corners less than 22 : ${result}%`);








    // console.log('                                                  ');
    // console.log('--------------------------------------------------');
    // console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    // console.log('✅ Calculate Corner Favor Percentage Greater Than .... :');
    // console.log('                                                  ');

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 0);
    // console.log(`✅ Percentage of corners favor greater than 0  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 1);
    // console.log(`✅ Percentage of corners favor greater than 1  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 2);
    // console.log(`✅ Percentage of corners favor greater than 2  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 3);
    // console.log(`✅ Percentage of corners favor greater than 3  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 4);
    // console.log(`✅ Percentage of corners favor greater than 4  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 5);
    // console.log(`✅ Percentage of corners favor greater than 5  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 6);
    // console.log(`✅ Percentage of corners favor greater than 6  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 7);
    // console.log(`✅ Percentage of corners favor greater than 7  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 8);
    // console.log(`✅ Percentage of corners favor greater than 8  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 9);
    // console.log(`✅ Percentage of corners favor greater than 9  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 10);
    // console.log(`✅ Percentage of corners favor greater than 10 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 11);
    // console.log(`✅ Percentage of corners favor greater than 11 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 12);
    // console.log(`✅ Percentage of corners favor greater than 12 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 13);
    // console.log(`✅ Percentage of corners favor greater than 13 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 14);
    // console.log(`✅ Percentage of corners favor greater than 14 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 15);
    // console.log(`✅ Percentage of corners favor greater than 15 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 16);
    // console.log(`✅ Percentage of corners favor greater than 16 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 17);
    // console.log(`✅ Percentage of corners favor greater than 17 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 18);
    // console.log(`✅ Percentage of corners favor greater than 18 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 19);
    // console.log(`✅ Percentage of corners favor greater than 19 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersFavor, 20);
    // console.log(`✅ Percentage of corners favor greater than 20 : ${result}%`);

    calculatePercentage(vecTotalCorners, '>', '✅ Percentage of total corners greater than');
    calculatePercentage(vecTotalCorners, '<', '✅ Percentage of total corners less than')

    calculatePercentage(vecTotalCornersFavor, '>', '✅ Percentage of corners favor greater than');
    calculatePercentage(vecTotalCornersFavor, '<', '✅ Percentage of corners favor less than');

    calculatePercentage(vecTotalCornersAgainst, '>', '✅ Percentage of corners against greater than');
    calculatePercentage(vecTotalCornersAgainst, '<', '✅ Percentage of corners against less than')

    //------------------------------------------------------------------------------






    //-------------------------------------------------------------------------------
    calculatePercentage(vecTotalGoals, '>', '✅ Percentage of total goals greater than');
    calculatePercentage(vecTotalGoals, '<', '✅ Percentage of total goals less than')

    calculatePercentage(vecTotalGoalsFavor, '>', '✅ Percentage of goals favor greater than');
    calculatePercentage(vecTotalGoalsFavor, '<', '✅ Percentage of goals favor less than');

    calculatePercentage(vecTotalGoalsAgainst, '>', '✅ Percentage of goals against greater than');
    calculatePercentage(vecTotalGoalsAgainst, '<', '✅ Percentage of goals against less than')

    // console.log('                                                  ');
    // console.log('--------------------------------------------------');
    // console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    // console.log('✅ Calculate Goals Percentage Greater Than .... :');
    // console.log('                                                  ');

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 0);
    // console.log(`✅ Percentage of goals greater than 0  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 1);
    // console.log(`✅ Percentage of goals greater than 1  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 2);
    // console.log(`✅ Percentage of goals greater than 2  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 3);
    // console.log(`✅ Percentage of goals greater than 3  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 4);
    // console.log(`✅ Percentage of goals greater than 4  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 5);
    // console.log(`✅ Percentage of goals greater than 5  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 6);
    // console.log(`✅ Percentage of goals greater than 6  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 7);
    // console.log(`✅ Percentage of goals greater than 7  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 8);
    // console.log(`✅ Percentage of goals greater than 8  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 9);
    // console.log(`✅ Percentage of goals greater than 9  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 10);
    // console.log(`✅ Percentage of goals greater than 10 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 11);
    // console.log(`✅ Percentage of goals greater than 11 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 12);
    // console.log(`✅ Percentage of goals greater than 12 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 13);
    // console.log(`✅ Percentage of goals greater than 13 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 14);
    // console.log(`✅ Percentage of goals greater than 14 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 15);
    // console.log(`✅ Percentage of goals greater than 15 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 16);
    // console.log(`✅ Percentage of goals greater than 16 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 17);
    // console.log(`✅ Percentage of goals greater than 17 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 18);
    // console.log(`✅ Percentage of goals greater than 18 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 19);
    // console.log(`✅ Percentage of goals greater than 19 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalGoals, 20);
    // console.log(`✅ Percentage of goals greater than 20 : ${result}%`);



    //------------------------------------------------------------------------------

    calculatePercentage(vecTotalShotsTarget, '>', '✅ Percentage of total shots on target greater than');
    calculatePercentage(vecTotalShotsTarget, '<', '✅ Percentage of total shots on target less than');

    calculatePercentage(vecShotsTargetFavor, '>', '✅ Percentage of total shots favor on target greater than');
    calculatePercentage(vecShotsTargetFavor, '<', '✅ Percentage of total shots favor on target less than');

    calculatePercentage(vecShotsTargetAgainst, '>', '✅ Percentage of total shots against on target greater than');
    calculatePercentage(vecShotsTargetAgainst, '<', '✅ Percentage of total shots against on target less than');


    // console.log(`vecShotsTargetFavor   = ${vecShotsTargetFavor}`);
    // console.log(`vecShotsTargetAgainst = ${vecShotsTargetAgainst}`);
    // console.log(`vecTotalShotsTarget   = ${vecTotalShotsTarget}`);

    // calculatePercentage(vecTotalGoalsFavor, '>', '✅ Percentage of goals favor greater than');
    // calculatePercentage(vecTotalGoalsFavor, '<', '✅ Percentage of goals favor less than');

    // calculatePercentage(vecTotalGoalsAgainst, '>', '✅ Percentage of goals against greater than');
    // calculatePercentage(vecTotalGoalsAgainst, '<', '✅ Percentage of goals against less than')

    // console.log('                                                  ');
    // console.log('--------------------------------------------------');
    // console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    // console.log('✅ Calculate Corner Against Percentage Greater Than .... :');
    // console.log('                                                  ');

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 0);
    // console.log(`✅ Percentage of corners against greater than 0  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 1);
    // console.log(`✅ Percentage of corners against greater than 1  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 2);
    // console.log(`✅ Percentage of corners against greater than 2  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 3);
    // console.log(`✅ Percentage of corners against greater than 3  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 4);
    // console.log(`✅ Percentage of corners against greater than 4  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 5);
    // console.log(`✅ Percentage of corners against greater than 5  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 6);
    // console.log(`✅ Percentage of corners against greater than 6  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 7);
    // console.log(`✅ Percentage of corners against greater than 7  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 8);
    // console.log(`✅ Percentage of corners against greater than 8  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 9);
    // console.log(`✅ Percentage of corners against greater than 9  : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 10);
    // console.log(`✅ Percentage of corners against greater than 10 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 11);
    // console.log(`✅ Percentage of corners against greater than 11 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 12);
    // console.log(`✅ Percentage of corners against greater than 12 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 13);
    // console.log(`✅ Percentage of corners against greater than 13 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 14);
    // console.log(`✅ Percentage of corners against greater than 14 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 15);
    // console.log(`✅ Percentage of corners against greater than 15 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 16);
    // console.log(`✅ Percentage of corners against greater than 16 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 17);
    // console.log(`✅ Percentage of corners against greater than 17 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 18);
    // console.log(`✅ Percentage of corners against greater than 18 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 19);
    // console.log(`✅ Percentage of corners against greater than 19 : ${result}%`);

    // var result = calculatePercentageGreaterThan(vecTotalCornersAgainst, 20);
    // console.log(`✅ Percentage of corners against greater than 20 : ${result}%`);




    // console.log('                                               ');
    // console.log('-----------------------------------------------');
    // console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    // console.log('✅ Calculate Goals Percentage Less Than .... :');
    // console.log('                                               ');

    // var result = calculatePercentageLessThan(vecTotalGoals, 1);
    // console.log(`✅ Percentage of goals less than 1  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 2);
    // console.log(`✅ Percentage of goals less than 2  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 3);
    // console.log(`✅ Percentage of goals less than 3  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 4);
    // console.log(`✅ Percentage of goals less than 4  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 5);
    // console.log(`✅ Percentage of goals less than 5  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 6);
    // console.log(`✅ Percentage of goals less than 6  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 7);
    // console.log(`✅ Percentage of goals less than 7  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 8);
    // console.log(`✅ Percentage of goals less than 8  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 9);
    // console.log(`✅ Percentage of goals less than 9  : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 10);
    // console.log(`✅ Percentage of goals less than 10 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 11);
    // console.log(`✅ Percentage of goals less than 11 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 12);
    // console.log(`✅ Percentage of goals less than 12 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 13);
    // console.log(`✅ Percentage of goals less than 13 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 14);
    // console.log(`✅ Percentage of goals less than 14 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 15);
    // console.log(`✅ Percentage of goals less than 15 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 16);
    // console.log(`✅ Percentage of goals less than 16 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 17);
    // console.log(`✅ Percentage of goals less than 17 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 18);
    // console.log(`✅ Percentage of goals less than 18 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 19);
    // console.log(`✅ Percentage of goals less than 19 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 20);
    // console.log(`✅ Percentage of goals less than 20 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 21);
    // console.log(`✅ Percentage of goals less than 21 : ${result}%`);

    // var result = calculatePercentageLessThan(vecTotalGoals, 22);
    // console.log(`✅ Percentage of goals less than 22 : ${result}%`);



    console.log('                                                  ');
    console.log('--------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('✅ Calculate Both Team To Score             .... :');
    console.log('                                                  ');

    var result = calculatePercentageGreaterThan(vecBTTS, 0);
    console.log(`✅ Percentage of Both Team To Score : ${result}%`);




    //----------------------------------------------------------------------------------


    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('✅ Calculate Corner Result Percentage .... :');
    console.log('                                            ');

    console.log(`vecCornersResult        = ${vecCornersResult}`);
    console.log(`vecCornersResult.length = ${vecCornersResult.length}`);

    var result = calculatePercentageResult(vecCornersResult, 'V');
    console.log(`✅ Victory Corner Percentage : ${result}%`);

    var result = calculatePercentageResult(vecCornersResult, 'D');
    console.log(`✅ Draw Corner Percentage    : ${result}%`);

    var result = calculatePercentageResult(vecCornersResult, 'L');
    console.log(`✅ Lost Corner Percentage    : ${result}%`);


    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------



    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('✅ Calculate Goals Result Percentage .... :');
    console.log('                                            ');

    console.log(`vecGoalsResult        = ${vecGoalsResult}`);
    console.log(`vecGoalsResult.length = ${vecGoalsResult.length}`);

    var result = calculatePercentageResult(vecGoalsResult, 'V');
    console.log(`✅ Victory Goal Percentage : ${result}%`);

    var result = calculatePercentageResult(vecGoalsResult, 'D');
    console.log(`✅ Draw Goal Percentage    : ${result}%`);

    var result = calculatePercentageResult(vecGoalsResult, 'L');
    console.log(`✅ Lost Goal Percentage    : ${result}%`);


    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('✅ Calculate Corner Result Percentage in range .... :');
    console.log('                                                     ');

    var result = calculatePercentageInRange(vecTotalCorners, 0, 5);
    console.log(`Percentage of corners in range [0,5]  : ${result}%`);

    var result = calculatePercentageInRange(vecTotalCorners, 6, 8);
    console.log(`Percentage of corners in range [6,8]  : ${result}%`);

    var result = calculatePercentageInRange(vecTotalCorners, 8, 12);
    console.log(`Percentage of corners in range [8,12] : ${result}%`);

    var result = calculatePercentageInRange(vecTotalCorners, 9, 11);
    console.log(`Percentage of corners in range [9,11] : ${result}%`);

    var result = calculatePercentageInRange(vecTotalCorners, 12, 14);
    console.log(`Percentage of corners in range [12,14]: ${result}%`);

    var result = calculatePercentageGreaterThanOrEqual(vecTotalCorners, 15);
    console.log(`Percentage of corners in range [15+]  : ${result}%`);

    console.log('                                            ');
    console.log('--------------------------------------------');



    //----------------------------------------------------------------------------------


    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('✅ Calculate Goals Result Percentage in range .... :');
    console.log('                                                     ');

    var result = calculatePercentageInRange(vecTotalGoals, 0, 5);
    console.log(`Percentage of goals in range [0,5]  : ${result}%`);

    var result = calculatePercentageInRange(vecTotalGoals, 6, 8);
    console.log(`Percentage of goals in range [6,8]  : ${result}%`);

    var result = calculatePercentageInRange(vecTotalGoals, 9, 11);
    console.log(`Percentage of goals in range [9,11] : ${result}%`);

    var result = calculatePercentageInRange(vecTotalGoals, 12, 14);
    console.log(`Percentage of goals in range [12,14]: ${result}%`);

    var result = calculatePercentageGreaterThanOrEqual(vecTotalGoals, 15);
    console.log(`Percentage of goals in range [15+]  : ${result}%`);

    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------



    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL GOALS separated by 10 MINUTES. :');
    console.log('                                                     ');

    var vecNormalizedGoalMinutes = normalizeGoalMinutes(vecAllGoalsMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);


    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 10);
    console.log(`Percentage of goals in range [0,10]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 11, 20);
    console.log(`Percentage of goals in range [11,20]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 21, 30);
    console.log(`Percentage of goals in range [21,30]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 31, 40);
    console.log(`Percentage of goals in range [31,40]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 41, 50);
    console.log(`Percentage of goals in range [41,50]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 61, 70);
    console.log(`Percentage of goals in range [61,70]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 71, 80);
    console.log(`Percentage of goals in range [71,80]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 81, 90);
    console.log(`Percentage of goals in range [81,90]  : ${result}%`);


    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL FAVOR GOALS separated by 10 MINUTES. :');
    console.log('                                                     ');


    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecGoalsFavorMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 10);
    console.log(`Percentage of goals in range [0,10]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 11, 20);
    console.log(`Percentage of goals in range [11,20]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 21, 30);
    console.log(`Percentage of goals in range [21,30]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 31, 40);
    console.log(`Percentage of goals in range [31,40]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 41, 50);
    console.log(`Percentage of goals in range [41,50]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 61, 60);
    console.log(`Percentage of goals in range [61,60]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 71, 80);
    console.log(`Percentage of goals in range [71,80]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 81, 90);
    console.log(`Percentage of goals in range [81,90]  : ${result}%`);


    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL AGAINST GOALS separated by 10 MINUTES. :');
    console.log('                                                     ');

    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecGoalsAgainstMinutesData);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 15);
    console.log(`Percentage of goals in range [0,15]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 16, 30);
    console.log(`Percentage of goals in range [16,30]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 31, 45);
    console.log(`Percentage of goals in range [31,45]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 46, 60);
    console.log(`Percentage of goals in range [46,60]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 61, 75);
    console.log(`Percentage of goals in range [61,75]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 76, 90);
    console.log(`Percentage of goals in range [76,90]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 71, 80);
    console.log(`Percentage of goals in range [71,80]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 81, 90);
    console.log(`Percentage of goals in range [81,90]  : ${result}%`);


    console.log('                                            ');
    console.log('--------------------------------------------');




    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------


    //----------------------------------------------------------------------------------

    var vec15mAllGoals = [];
    
    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL GOALS separated by 15 MINUTES. :');
    console.log('                                                     ');

    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecAllGoalsMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);


    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 15);
    console.log(`Percentage of goals in range [0,15]   : ${result}%`);
    vec15mAllGoals.push(result);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 16, 30);
    console.log(`Percentage of goals in range [16,30]  : ${result}%`);
    vec15mAllGoals.push(result);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 31, 45);
    console.log(`Percentage of goals in range [31,45]  : ${result}%`);
    vec15mAllGoals.push(result);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 46, 60);
    console.log(`Percentage of goals in range [46,60]  : ${result}%`);
    vec15mAllGoals.push(result);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 61, 75);
    console.log(`Percentage of goals in range [61,75]  : ${result}%`);
    vec15mAllGoals.push(result);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 76, 90);
    console.log(`Percentage of goals in range [76,90]  : ${result}%`);
    vec15mAllGoals.push(result);


    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL FAVOR GOALS separated by 15 MINUTES. :');
    console.log('                                                     ');


    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecGoalsFavorMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 15);
    console.log(`Percentage of goals in range [0,15]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 16, 30);
    console.log(`Percentage of goals in range [16,30]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 31, 45);
    console.log(`Percentage of goals in range [31,45]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 46, 60);
    console.log(`Percentage of goals in range [46,60]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 61, 75);
    console.log(`Percentage of goals in range [61,75]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 76, 90);
    console.log(`Percentage of goals in range [76,90]  : ${result}%`);


    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL AGAINST GOALS separated by 15 MINUTES. :');
    console.log('                                                     ');

    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecGoalsAgainstMinutesData);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 15);
    console.log(`Percentage of goals in range [0,15]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 16, 30);
    console.log(`Percentage of goals in range [16,30]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 31, 45);
    console.log(`Percentage of goals in range [31,45]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 46, 60);
    console.log(`Percentage of goals in range [46,60]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 61, 75);
    console.log(`Percentage of goals in range [61,75]  : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 76, 90);
    console.log(`Percentage of goals in range [76,90]  : ${result}%`);


    console.log('                                            ');
    console.log('--------------------------------------------');


    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL GOALS separated by 45 MINUTES. :');
    console.log('                                                     ');

    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecAllGoalsMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 45);
    console.log(`Percentage of goals in range [0,45]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 46, 90);
    console.log(`Percentage of goals in range [46,90]  : ${result}%`);

    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL FAVOR GOALS separated by 45 MINUTES. :');
    console.log('                                                     ');


    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecGoalsFavorMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 45);
    console.log(`Percentage of goals in range [0,45]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 46, 90);
    console.log(`Percentage of goals in range [46,90]  : ${result}%`);

    //----------------------------------------------------------------------------------

    console.log('                                                     ');
    console.log('-----------------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('                                                     ');

    console.log('✅ Percentage of ALL AGAINST GOALS separated by 45 MINUTES. :');
    console.log('                                                     ');

    vecNormalizedGoalMinutes = normalizeGoalMinutes(vecGoalsAgainstMinutesData);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    vecNormalizedGoalMinutes = sortArrayAscending(vecNormalizedGoalMinutes);
    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);
    console.log(`Number of Goals  = ${vecNormalizedGoalMinutes.length}`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 0, 45);
    console.log(`Percentage of goals in range [0,45]   : ${result}%`);

    var result = calculatePercentageInRange(vecNormalizedGoalMinutes, 46, 90);
    console.log(`Percentage of goals in range [46,90]  : ${result}%`);

    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------



    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log('TEAM ANALYZE :  ');
    console.log('                                            ');
    console.log(`teamAnalyze = ${teamAnalyze}`);
    console.log(`nGamesAnalyze = ${nGamesAnalyze}`);
    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------
    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`SATISTICS CORNERS VECTORS : ${teamAnalyze}`);
    console.log('                                            ');
    console.log(`vecTotalCornersFavor   = ${vecTotalCornersFavor}`);
    console.log(`vecTotalCornersAgainst = ${vecTotalCornersAgainst}`);
    console.log(`vecTotalCorners        = ${vecTotalCorners}`);
    console.log(`vecCornersResult       = ${vecCornersResult}`);

    //----------------------------------------------------------------------------------

    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('SATISTICS CORNERS                        :  ');
    console.log('                                            ');




    console.log(`                                            `);
    mediaCornersFavor = calculateAverage(vecTotalCornersFavor)
    console.log(`mediaCornersFavor   = ${mediaCornersFavor}`);

    mediaCornersAgainst = calculateAverage(vecTotalCornersAgainst)
    console.log(`mediaCornersAgainst = ${mediaCornersAgainst}`);

    mediaCorners = calculateAverage(vecTotalCorners)
    console.log(`mediaCorners        = ${mediaCorners}`);


    //----------------------------------------------------------------------------------
    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('SATISTICS GOALS VECTORS:');
    console.log('                                            ');
    console.log(`vecTotalGoalsFavor   = ${vecTotalGoalsFavor}`);
    console.log(`vecTotalGoalsAgainst = ${vecTotalGoalsAgainst}`);
    console.log(`vecTotalGoals        = ${vecTotalGoals}`);
    console.log(`vecGoalsResult       = ${vecGoalsResult}`);
    console.log(`vecBTTS              = ${vecBTTS}`);

    //----------------------------------------------------------------------------------

    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('SATISTICS GOALS :                           ');
    console.log('                                            ');




    console.log(`                                            `);
    mediaGoalsFavor = calculateAverage(vecTotalGoalsFavor)
    console.log(`mediaGoalsFavor   = ${mediaGoalsFavor}`);

    mediaGoalsAgainst = calculateAverage(vecTotalGoalsAgainst)
    console.log(`mediaGoalsAgainst = ${mediaGoalsAgainst}`);

    mediaGoals = calculateAverage(vecTotalGoals)
    console.log(`mediaGoals        = ${mediaGoals}`);

    //----------------------------------------------------------------------------------

    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('SATISTICS TOTAL SHOTS:');
    console.log('                                            ');
    console.log(`vecTotalShotsFavor  = ${vecTotalShotsFavor}`);
    console.log(`vecTotalShotAgainst = ${vecTotalShotAgainst}`);
    console.log(`vecTotalShots       = ${vecTotalShots}`);



    console.log(`                                            `);
    mediaTotalShotsFavor = calculateAverage(vecTotalShotsFavor)
    console.log(`mediaTotalShotsFavor   = ${mediaTotalShotsFavor}`);

    mediaTotalShotsAgainst = calculateAverage(vecTotalShotAgainst)
    console.log(`mediaTotalShotsAgainst = ${mediaTotalShotsAgainst}`);

    mediaTotalShots = calculateAverage(vecTotalShots)
    console.log(`mediaTotalShots        = ${mediaTotalShots}`);




    //----------------------------------------------------------------------------------


    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('SATISTICS TOTAL SHOTS ON TARGET:');
    console.log('                                            ');
    console.log(`vecShotsTargetFavor   = ${vecShotsTargetFavor}`);
    console.log(`vecShotsTargetAgainst = ${vecShotsTargetAgainst}`);
    console.log(`vecTotalShotsTarget   = ${vecTotalShotsTarget}`);





    console.log(`                                            `);
    mediaTotalShotsTargetFavor = calculateAverage(vecShotsTargetFavor)
    console.log(`mediaTotalShotsTargetFavor   = ${mediaTotalShotsTargetFavor}`);

    mediaTotalShotsTargetAgainst = calculateAverage(vecShotsTargetAgainst)
    console.log(`mediaTotalShotsTargetAgainst = ${mediaTotalShotsTargetAgainst}`);

    mediaTotalShotsTarget = calculateAverage(vecTotalShotsTarget)
    console.log(`mediaTotalShotsTarget        = ${mediaTotalShotsTarget}`);



    //----------------------------------------------------------------------------------
    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log('                                            ');

    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('GOALS MINUTES:');
    console.log(`vecAllGoalsMinutes  = ${vecAllGoalsMinutes}`);
    console.log(`vecGoalsFavorMinutes = ${vecGoalsFavorMinutes}`);
    console.log(`vecGoalsAgainstMinutesData = ${vecGoalsAgainstMinutesData}`);

    console.log(`vecNormalizedGoalMinutes  = ${vecNormalizedGoalMinutes}`);


    //----------------------------------------------------------------------------------





    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('LAST RESULTS:');


    console.log('                                            ');
    for (var i = 0; i < vecTime.length; i++) {
        console.log('                                         ');
        console.log(`${vecTime[i]} -> ${vecHomeTeam[i]} ${vecHomeScore[i]}:${vecAwayScore[i]} ${vecAwayTeam[i]}`);
    }
    //----------------------------------------------------------------------------------

    console.log('                                            ');
    console.log('--------------------------------------------');

    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log(`TEAM ANALYZE : ${teamAnalyze} - LAST ${nGamesAnalyze} GAMES`);
    console.log('FAILED ANALYSIS : ');
    console.log('                                          ');

    nFailedAnalyses = nGamesAnalyze - vecGoalsResult.length

    console.log(`nFailedAnalyses = ${nFailedAnalyses}`);

    console.log('                                            ');
    console.log('--------------------------------------------');

    //----------------------------------------------------------------------------------
    console.log('                                            ');
    console.log('--------------------------------------------');
    console.log('TEAM ANALYZE :  ');
    console.log('                                            ');
    console.log(`teamAnalyze = ${teamAnalyze}`);
    console.log(`nGamesAnalyze = ${nGamesAnalyze}`);
    console.log('                                            ');
    console.log('--------------------------------------------');






    //----------------------------------------------------------------------------------
    // Write vectors to JSON



    // Create an object to hold all vectors
    const data = {
        country,
        dateLastGame:vecTime[0],
        teamAnalyze,
        nGamesAnalyze,
        nFailedAnalyses,
        vecTotalCornersFavor,
        vecTotalCornersAgainst,
        vecTotalCorners,
        vecCornersResult,
        vecTotalGoalsFavor,
        vecTotalGoalsAgainst,
        vecTotalGoals,
        vecGoalsResult,
        vecBTTS,
        vecTotalShotsFavor,
        vecTotalShotAgainst,
        vecTotalShots,
        vecShotsTargetFavor,
        vecShotsTargetAgainst,
        vecTotalShotsTarget,
        vec15mAllGoals,
        mediaCornersFavor,
        mediaCornersAgainst,
        mediaCorners,
        mediaGoalsFavor,
        mediaGoalsAgainst,
        mediaGoals,
        mediaTotalShotsFavor,
        mediaTotalShotsAgainst,
        mediaTotalShots,
        mediaTotalShotsTargetFavor,
        mediaTotalShotsTargetAgainst,
        mediaTotalShotsTarget,

    };

    const fileStatisticsTeam = 'public/' + teamAnalyze + '.json'

    // Write to JSON file
    fs.writeFile(fileStatisticsTeam, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('Data successfully written to cornerData.json');
        }
    });


    // // Write to JSON file
    // fs.writeFile('public/cornerData.json', JSON.stringify(data, null, 2), (err) => {
    //     if (err) {
    //         console.error('Error writing file:', err);
    //     } else {
    //         console.log('Data successfully written to cornerData.json');
    //     }
    // });



    // return { stats };

    await browser.close();

    console.log('END - OK');
})();


