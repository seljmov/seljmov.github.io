const generateCampaignCard = (campaign) => {
    const campaignCard = document.createElement('div');
    campaignCard.classList.add('campaign-card');

    const campaignTitle = document.createElement('h3');
    campaignTitle.classList.add('campaign-title');
    campaignTitle.textContent = campaign.title + ' (' + campaign.id + ')';

    const campaignInfo = document.createElement('div');
    campaignInfo.classList.add('campaign-info');

    const campaignAmount = document.createElement('div');
    campaignAmount.classList.add('campaign-amount');

    const campaignAmountGoal = document.createElement('div');
    campaignAmountGoal.classList.add('campaign-amount-goal');

    const campaignAmountGoalTitle = document.createElement('p');
    campaignAmountGoalTitle.classList.add('campaign-amount-goal-title');
    campaignAmountGoalTitle.textContent = 'Нужно';

    const campaignAmountGoalValue = document.createElement('span');
    campaignAmountGoalValue.classList.add('campaign-amount-goal-value');
    campaignAmountGoalValue.textContent = `${campaign.goal} ₽`;

    campaignAmountGoal.appendChild(campaignAmountGoalTitle);
    campaignAmountGoal.appendChild(campaignAmountGoalValue);

    const campaignAmountCollected = document.createElement('div');
    campaignAmountCollected.classList.add('campaign-amount-collected');

    const campaignAmountCollectedTitle = document.createElement('p');
    campaignAmountCollectedTitle.classList.add('campaign-amount-collected-title');
    campaignAmountCollectedTitle.textContent = 'Собрали';

    const campaignAmountCollectedValue = document.createElement('span');
    campaignAmountCollectedValue.classList.add('campaign-amount-collected-value');
    campaignAmountCollectedValue.textContent = `${campaign.collected} ₽`;

    campaignAmountCollected.appendChild(campaignAmountCollectedTitle);
    campaignAmountCollected.appendChild(campaignAmountCollectedValue);

    campaignAmount.appendChild(campaignAmountGoal);
    campaignAmount.appendChild(campaignAmountCollected);

    const campaignActions = document.createElement('div');
    campaignActions.classList.add('campaign-actions');

    const campaignShare = document.createElement('button');
    campaignShare.classList.add('campaign-share');
    campaignShare.textContent = 'Поделиться';

    const campaignHelp = document.createElement('button');
    campaignHelp.classList.add('campaign-help');
    campaignHelp.textContent = 'Помочь';

    campaignActions.appendChild(campaignShare);
    campaignActions.appendChild(campaignHelp);

    campaignInfo.appendChild(campaignAmount);
    campaignInfo.appendChild(campaignActions);

    campaignCard.appendChild(campaignTitle);
    campaignCard.appendChild(campaignInfo);

    return campaignCard;
}

async function findUserIdByNumber(filePath, number) {
    try {
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла: ' + response.statusText);
        }

        const data = await response.json();

        // Находим соответствующий ключ (user_id) по значению (число)
        for (const [userId, value] of Object.entries(data)) {
            if (value == number) {
                return userId;
            }
        }

        console.log("Пользователь с таким числом не найден.");
        return null;

    } catch (error) {
        console.error("Произошла ошибка:", error);
        return null;
    }
}

async function getCampaignsIds(filePath) {
    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error('Ошибка загрузки файла: ' + response.statusText);
        }

        const data = await response.json();

        return Array.from(data["Query result"]).map(campaign => campaign.id);
    } catch (error) {
        console.error("Произошла ошибка:", error);
        return [];
    }
}

async function findCampaignWithMostKeywords(campaigns) {
    if (Object.keys(campaigns).length === 0) {
        return Promise.resolve({}); // Возвращаем промис с пустым объектом
    }

    try {
        const campaignsIds = await getCampaignsIds('data/campaigns.json');
        const campaignsIdsArray = Array.from(campaignsIds);

        const filteredCampaignsIds = Object.keys(campaigns).filter(campaignId => campaignsIdsArray.includes(parseInt(campaignId)));
        const filteredCampaigns = Object.fromEntries(filteredCampaignsIds.map(campaignId => [campaignId, campaigns[parseInt(campaignId)]]));

        // Находим максимальное количество ключевых слов
        const maxKeywordsCount = Math.max(...Object.values(filteredCampaigns).map(keywords => keywords.length));

        // Находим все кампании с максимальным количеством ключевых слов
        const topCampaigns = Object.entries(filteredCampaigns)
            .filter(([_, keywords]) => keywords.length === maxKeywordsCount)
            .map(([campaignId, keywords]) => ({
                campaign_id: campaignId,
                keywords_count: keywords.length,
                keywords: keywords
            }));

        let max = topCampaigns[0].keywords_count;
        if (topCampaigns.length < 8) {
            while (max > 0 && topCampaigns.length < 8) {
                const topCampaignsMax = Object.entries(filteredCampaigns)
                    .filter(([_, keywords]) => keywords.length === max)
                    .map(([campaignId, keywords]) => ({
                        campaign_id: campaignId,
                        keywords_count: keywords.length,
                        keywords: keywords
                    }));
                topCampaigns.push(...topCampaignsMax);
                max--;
            }
        }

        return topCampaigns;
    } catch (error) {
        console.error("Произошла ошибка:", error);
        return [];
    }
}

async function getCampaignsByKeywords(filePath, predictionArray) {
    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error('Ошибка загрузки файла: ' + response.statusText);
        }

        const data = await response.json();
        const campaigns = {};

        // Пройдём по каждому ключевому слову из предсказания
        predictionArray.forEach(keyword => {
            // Найдём кампании, в которых встречается это ключевое слово
            const keywordCampaigns = Array.from(data["Query result"]).filter(campaign => campaign.keyword_id == keyword);

            // Добавим кампании в объект
            keywordCampaigns.forEach(campaign => {
                campaign.id = campaign.campaign_id;
                if (campaigns[campaign.id]) {
                    campaigns[campaign.id].push(keyword);
                } else {
                    campaigns[campaign.id] = [keyword];
                }
            });
        });

        return campaigns;
    } catch (error) {
        console.error("Произошла ошибка:", error);
        return {};
    }
}

async function getCampaignsDetails(filePath, campaignIds) {
    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error('Ошибка загрузки файла: ' + response.statusText);
        }

        const data = await response.json();
        const campaigns = {};

        // Найдём кампании по их id
        campaignIds.forEach(campaignId => {
            const campaign = Array.from(data["Query result"]).find(campaign => campaign.id === parseInt(campaignId));

            if (campaign) {
                campaigns[campaignId] = campaign;
            }
        });

        return campaigns;
    } catch (error) {
        console.error("Произошла ошибка:", error);
        return {};
    }
}