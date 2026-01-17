const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

var currentProgram = process.argv[2];
var fileLog = 'handicap_' + getTimestamp() + '.txt';
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

// Função para extrair eventos - será executada no contexto do navegador
async function extractEventsFromDOM(page) {
    return await page.evaluate(() => {
        const events = [];

        // Encontrar todos os cartões de eventos
        const eventCards = document.querySelectorAll('sports-events-event-card');

        eventCards.forEach((card, index) => {
            try {
                // Extrair link do evento
                const linkElement = card.querySelector('a.cardEvent');
                const eventLink = linkElement ? linkElement.getAttribute('href') : '';

                // Extrair informações do evento
                const eventInfo = card.querySelector('sports-events-event-info');

                // Extrair informações do breadcrumb
                const breadcrumbItems = eventInfo ? eventInfo.querySelectorAll('bcdk-breadcrumb-item') : [];
                let leagueInfo = '';
                if (breadcrumbItems.length >= 3) {
                    const leagueItem = breadcrumbItems[breadcrumbItems.length - 1];
                    const labelSpan = leagueItem.querySelector('.breadcrumb_itemLabel');
                    if (labelSpan) {
                        // Remover tags HTML e extrair texto
                        leagueInfo = labelSpan.textContent.trim().replace(/\s+/g, ' ');
                    }
                }

                // Extrair contagem de apostas
                const betsElement = card.querySelector('.event_betsNum');
                const betsCount = betsElement ? betsElement.textContent.trim() : '+0';

                // Extrair informações do placar
                const scoreboard = card.querySelector('scoreboards-scoreboard');

                // Nomes das equipes
                const team1Element = scoreboard ? scoreboard.querySelector('.scoreboard_contestant-1 .scoreboard_contestantLabel') : null;
                const team2Element = scoreboard ? scoreboard.querySelector('.scoreboard_contestant-2 .scoreboard_contestantLabel') : null;

                const team1 = team1Element ? team1Element.textContent.trim() : '';
                const team2 = team2Element ? team2Element.textContent.trim() : '';

                // Hora do evento
                const timeElement = scoreboard ? scoreboard.querySelector('.scoreboard_hour') : null;
                const eventTime = timeElement ? timeElement.textContent.trim() : '';

                // Placar (se disponível)
                const scoreElement = scoreboard ? scoreboard.querySelector('.scoreboard_totalScore') : null;
                const score = scoreElement ? scoreElement.textContent.trim() : '-';

                // Extrair odds (probabilidades)
                const oddsButtons = card.querySelectorAll('.btn.is-odd');
                const odds = [];

                oddsButtons.forEach(button => {
                    const labelElement = button.querySelector('.btn_label.is-top span');
                    const oddValueElement = button.querySelector('.btn_label:not(.is-top)');

                    if (labelElement && oddValueElement) {
                        const teamName = labelElement.textContent.trim();
                        const oddValue = oddValueElement.textContent.trim();

                        // Extrair tendência (progress bar)
                        const progressBar = button.querySelector('.progressBar_fill');
                        let trendPercentage = 0;
                        if (progressBar) {
                            const style = progressBar.getAttribute('style');
                            const match = style ? style.match(/width:\s*(\d+)%/) : null;
                            trendPercentage = match ? parseInt(match[1]) : 0;
                        }

                        odds.push({
                            team: teamName,
                            odd: parseFloat(oddValue.replace(',', '.')),
                            trendPercentage: trendPercentage
                        });
                    }
                });

                // Determinar país baseado na classe do ícone da bandeira
                let country = '';
                const flagIcon = eventInfo ? eventInfo.querySelector('.flagsIconBg') : null;
                if (flagIcon) {
                    const classList = flagIcon.className.split(' ');
                    const countryClass = classList.find(cls => cls.startsWith('is-'));
                    if (countryClass) {
                        const countryCode = countryClass.replace('is-', '');
                        // Mapear códigos para nomes de países
                        const countryMap = {
                            'IL': 'Israel',
                            'SA': 'Arábia Saudita',
                            'EN': 'Inglaterra',
                            'ND': 'Escócia',
                            'NT': 'Irlanda do Norte',
                            'WA': 'País de Gales',
                            'PT': 'Portugal',
                            'ZZ': 'CAN'
                        };
                        country = countryMap[countryCode] || countryCode;
                    }
                }

                // Extrair informações de TV (se disponível)
                const tvElement = card.querySelector('.event_infoTv');
                const hasTv = tvElement ? true : false;

                // Criar objeto do evento
                const event = {
                    id: index + 1,
                    link: eventLink,
                    team1: team1,
                    team2: team2,
                    time: eventTime,
                    score: score,
                    league: leagueInfo,
                    country: country,
                    bets: betsCount,
                    hasTv: hasTv,
                    odds: odds,
                    rawTeam1: team1,
                    rawTeam2: team2
                };

                events.push(event);
            } catch (error) {
                console.error(`Erro ao processar evento ${index + 1}:`, error);
            }
        });

        return events;
    });
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Set to true to run headless
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        await page.goto('https://www.betclic.pt/futebol-sfootball', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('✅ Successfully loaded https://www.betclic.pt/futebol-sfootball');
    } catch (error) {
        console.error('❌ Failed to load https://www.betclic.pt/futebol-sfootball', error.message);
        process.exit(0);
    }

    console.log("✅ Click on 'Reject All' cookies");

    try {
        await page.waitForSelector("#popin_tc_privacy_button_3", {
            timeout: 10000
        });
        await page.click("#popin_tc_privacy_button_3");
        console.log('✅ Cookies rejected');
        await delay(2000); // Esperar um pouco para a página processar
    } catch (error) {
        console.log('⚠️ Cookie button not found or already handled');
    }

    // Extrair eventos
    console.log('🔄 Extracting events from DOM...');
    const events = await extractEventsFromDOM(page);

    console.log(`✅ Extracted ${events.length} events`);
    // console.log('📋 Events data:', JSON.stringify(events, null, 2));

    // Salvar em arquivo JSON
    const jsonFileName = `events_${getTimestamp()}.json`;
    fs.writeFileSync(jsonFileName, JSON.stringify(events, null, 2));
    // console.log(`💾 Events saved to ${jsonFileName}`);


    // Your JSON data
    // const events = [ /* your JSON data here */ ];

    console.log('📊 ALL EVENTS ODDS SUMMARY');
    console.log('='.repeat(60));

    // Iterate through each event
    events.forEach((event, eventIndex) => {
        // console.log(`\n🏆 Event ${event.id}: ${event.team1} vs ${event.team2}`);
        // console.log(`   📍 ${event.country} | 🏁 ${event.league}`);
        // console.log(`   ⏰ Time: ${event.time || 'N/A'} | 🔢 Bets: ${event.bets}`);
        // console.log('-'.repeat(40));

        // Check if odds exist for this event
        if (event.odds && event.odds.length > 0) {
            

            // console.log(`event.odds[0].odd = ${event.odds[0].odd}`);
            // console.log(`event.odds[2].odd = ${event.odds[2].odd}`);
            let oddDiffHomeAway = Math.abs((event.odds[0].odd - event.odds[2].odd).toFixed(2));
            // console.log(`oddDiffHomeAway = ${oddDiffHomeAway}`);

            if (oddDiffHomeAway <= 0.5) {
                console.log('   Odds available:');
                // Iterate through each odd in the event
                event.odds.forEach((odd, oddIndex) => {
                    // Safely handle null/undefined odd values
                    const oddValue = odd.odd !== null && odd.odd !== undefined
                        ? odd.odd.toFixed(2)
                        : 'N/A';

                    console.log(`   ${oddIndex + 1}. ${odd.team}: ${oddValue} (Trend: ${odd.trendPercentage}%)`);
                });
                
                console.log(`\n🏆 Event ${event.id}: ${event.team1} vs ${event.team2}`);
                console.log(`   📍 ${event.country} | 🏁 ${event.league}`);
                console.log(`   ⏰ Time: ${event.time || 'N/A'} | 🔢 Bets: ${event.bets}`);
                console.log(`   Odd Difernce Home Away = ${oddDiffHomeAway} <------------   `);
                console.log('-'.repeat(40));

            }

        } else {
            console.log('   ❌ No odds available for this event');
        }
    });

    // console.log('='.repeat(60));
    // console.log(`✅ Total events processed: ${events.length}`);
    // console.log(`📈 Events with odds: ${events.filter(e => e.odds && e.odds.length > 0).length}`);
    // console.log(`📉 Events without odds: ${events.filter(e => !e.odds || e.odds.length === 0).length}`);

    // Exibir resumo dos eventos
    // console.log('\n📊 EVENT SUMMARY:');
    // console.log('='.repeat(50));
    // events.forEach(event => {
    //     console.log(`\n🏆 ${event.team1} vs ${event.team2}`);
    //     console.log(`   ⏰ ${event.time} | 📍 ${event.country} | 🏁 ${event.league}`);
    //     console.log(`   💰 Apostas: ${event.bets} | 📺 TV: ${event.hasTv ? 'Sim' : 'Não'}`);
    //     console.log(`   Odds:`);
    //     // event.odds.forEach(odd => {
    //     //     console.log(`     ${odd.team}: ${odd.odd.toFixed(2)} (${odd.trendPercentage}%)`);
    //     // });

    //     // Check for null odds before displaying
    //     event.odds.forEach((odd, oddIndex) => {
    //         if (odd.odd === null) {
    //             console.warn(`⚠️  WARNING: Event ${eventIndex + 1}, Odd ${oddIndex + 1} has null value for ${odd.team}`);
    //         }
    //     });

    //     // Safe display
    //     event.odds.forEach(odd => {
    //         const oddValue = odd.odd !== null ? odd.odd.toFixed(2) : 'N/A';
    //         console.log(`     ${odd.team}: ${oddValue} (${odd.trendPercentage}%)`);
    //     });


    // });
    console.log('='.repeat(50));

    await browser.close();

    console.log('✅ END - Process completed successfully');
})();