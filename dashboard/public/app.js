// ==========================================
// DASHBOARD AUTHENTICATION
// ==========================================

let dashboardUser = null;

const originalFetch =
    window.fetch.bind(window);

window.fetch = async function (...args) {
    const response =
        await originalFetch(...args);

    if (
        response.status === 401 &&
        !String(args[0] || '').includes('/auth/')
    ) {
        window.location.href =
            '/auth/discord';
    }

    return response;
};

async function loadDashboardAuth() {
    try {
        const response =
            await originalFetch('/auth/me');

        const data =
            await response.json();

        if (!data.authenticated) {
            window.location.href =
                '/auth/discord';

            return false;
        }

        dashboardUser =
            data.user;

        const name =
            document.getElementById(
                'dashboard-user-name'
            );

        const tag =
            document.getElementById(
                'dashboard-user-tag'
            );

        const avatar =
            document.getElementById(
                'dashboard-user-avatar'
            );

        const placeholder =
            document.getElementById(
                'dashboard-user-avatar-placeholder'
            );

        if (name) {
            name.textContent =
                data.user.globalName ||
                data.user.username;
        }

        if (tag) {
            tag.textContent =
                `@${data.user.username}`;
        }

        if (avatar && data.user.avatar) {
            avatar.src =
                data.user.avatar;

            avatar.style.display =
                'block';

            if (placeholder) {
                placeholder.style.display =
                    'none';
            }
        } else if (placeholder) {
            placeholder.textContent =
                (
                    data.user.globalName ||
                    data.user.username ||
                    'D'
                )
                    .charAt(0)
                    .toUpperCase();
        }

        return true;

    } catch (error) {
        console.error(
            'Failed to load dashboard authentication:',
            error
        );

        window.location.href =
            '/auth/discord';

        return false;
    }
}

async function logoutDashboard() {
    try {
        await originalFetch(
            '/auth/logout',
            {
                method: 'POST'
            }
        );
    } finally {
        window.location.href =
            '/auth/discord';
    }
}

const dashboardLogout =
    document.getElementById(
        'dashboard-logout'
    );

if (dashboardLogout) {
    dashboardLogout.addEventListener(
        'click',
        logoutDashboard
    );
}

const navItems =
    document.querySelectorAll('.nav-item');


const pages =
    document.querySelectorAll('.page');


const pageTitle =
    document.getElementById('page-title');


const pageNames = {

    overview:
        'Overview',

    settings:
        'Server Settings',

    shop:
        'Shop',

    cosmetics:
        'Cosmetics',

    leaks:
        'Leaks',

    news:
        'News',

    giveaways:
        'Giveaways',

    moderation:
        'Moderation'

};


// ==========================================
// NAVIGATION
// ==========================================

function showPage(pageName) {

    pages.forEach(
        page => {

            page.classList.remove(
                'active'
            );

        }
    );


    navItems.forEach(
        item => {

            item.classList.remove(
                'active'
            );

        }
    );


    const selectedPage =
        document.getElementById(
            `page-${pageName}`
        );


    const selectedNav =
        document.querySelector(
            `.nav-item[data-page="${pageName}"]`
        );


    if (
        !selectedPage ||
        !selectedNav
    ) {

        return;

    }


    selectedPage.classList.add(
        'active'
    );


    selectedNav.classList.add(
        'active'
    );


    if (pageTitle) {

        pageTitle.textContent =
            pageNames[pageName] ||
            'Dashboard';

    }


if (
    pageName === 'settings' ||
    pageName === 'moderation'
) {

    loadServers();

}

if (
    pageName === 'shop'
) {

    loadShop();

}

if (
    pageName === 'giveaways'
) {

    loadGiveaways();

}

if (
    pageName === 'cosmetics'
) {

    setupCosmeticsSearch();
    loadNewCosmetics();

}

if (
    pageName === 'leaks'
) {

    loadLeaks();

}
}


// ==========================================
// NAVIGATION EVENTS
// ==========================================

navItems.forEach(
    item => {

        item.addEventListener(
            'click',
            () => {

                showPage(
                    item.dataset.page
                );

            }
        );

    }
);


// ==========================================
// BOT STATUS
// ==========================================

async function loadStatus() {

    try {

        const response =
            await fetch(
                '/api/status'
            );


        const data =
            await response.json();


        const online =
            data.status === 'online';

        const environment =
            document.querySelector(
                '.environment'
            );

        if (environment) {
            environment.innerHTML = `
                <span class="status-dot"></span>
                ${
                    data.environment === 'production'
                        ? 'Production'
                        : 'Development'
                }
            `;
        }


        const botStatus =
            document.getElementById(
                'bot-status'
            );


        const statusCard =
            document.getElementById(
                'status-card'
            );


        if (botStatus) {

            botStatus.textContent =
                online
                    ? 'Online'
                    : 'Offline';

        }


        if (statusCard) {

            statusCard.textContent =
                online
                    ? 'Online'
                    : 'Offline';

        }

        const heroSystemStatus =
            document.getElementById(
                'hero-system-status'
            );

        if (heroSystemStatus) {

            heroSystemStatus.textContent =
                online
                    ? 'Online'
                    : 'Offline';

        }


        // SERVER COUNT

        const serverCount =
            document.getElementById(
                'server-count'
            );


        if (serverCount) {

            serverCount.textContent =
                data.servers ?? 0;

        }


        // SHOP STATUS

        const shopStatus =
            document.getElementById(
                'shop-status'
            );


        if (shopStatus) {

            shopStatus.textContent =
                data.trackers?.shop?.active
                    ? 'Active'
                    : 'Offline';

        }


        // SHOP LAST RESET

        const shopLastReset =
            document.getElementById(
                'shop-last-reset'
            );


        if (shopLastReset) {

            shopLastReset.textContent =
                formatDate(
                    data.trackers?.shop?.lastReset
                );

        }


        // SHOP BADGE

        const shopBadge =
            document.getElementById(
                'shop-tracker-badge'
            );


        if (shopBadge) {

            shopBadge.textContent =
                data.trackers?.shop?.active
                    ? 'Active'
                    : 'Offline';

        }


        // LEAK STATUS

        const leakStatus =
            document.getElementById(
                'leak-status'
            );


        if (leakStatus) {

            leakStatus.textContent =
                data.trackers?.leaks?.active
                    ? 'Active'
                    : 'Offline';

        }


        // LEAK LAST CHECK

        const leakLastCheck =
            document.getElementById(
                'leak-last-check'
            );


        if (leakLastCheck) {

            leakLastCheck.textContent =
                formatDate(
                    data.trackers?.leaks?.lastCheck
                );

        }


        // TRACKED POSTS

        const trackedPosts =
            document.getElementById(
                'tracked-posts'
            );


        if (trackedPosts) {

            trackedPosts.textContent =
                data.trackers?.leaks?.trackedPosts ??
                0;

        }


        // LEAK BADGE

        const leakBadge =
            document.getElementById(
                'leak-tracker-badge'
            );


        if (leakBadge) {

            leakBadge.textContent =
                data.trackers?.leaks?.active
                    ? 'Active'
                    : 'Offline';

        }


        // NEWS BADGE

        const newsBadge =
            document.getElementById(
                'news-tracker-badge'
            );


        if (newsBadge) {

            newsBadge.textContent =
                data.trackers?.news?.active
                    ? 'Active'
                    : 'Offline';

        }


    } catch (error) {

        console.error(
            'Failed to load dashboard status:',
            error
        );


        const botStatus =
            document.getElementById(
                'bot-status'
            );


        const statusCard =
            document.getElementById(
                'status-card'
            );


        if (botStatus) {

            botStatus.textContent =
                'Offline';

        }


        if (statusCard) {

            statusCard.textContent =
                'Offline';

        }

    }

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(value) {

    if (!value) {

        return 'No data';

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return 'Unknown';

    }


    return date.toLocaleString();

}


// ==========================================
// LOAD DAILY SHOP
// ==========================================

async function loadShop() {

    const loading =
        document.getElementById(
            'shop-loading'
        );


    const content =
        document.getElementById(
            'shop-content'
        );


    if (
        !loading ||
        !content
    ) {

        return;

    }


    loading.style.display =
        'block';


    content.style.display =
        'none';


    try {

        const response =
            await fetch(
                '/api/shop'
            );


        if (!response.ok) {

            throw new Error(
                `Shop API returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.error ||
                'Failed to load shop.'
            );

        }


        if (
            !data.available ||
            !data.shop
        ) {

            loading.textContent =
                'No Daily Shop data available yet.';


            return;

        }


        const shop =
            data.shop;


        // ==================================
        // SHOP DATE
        // ==================================

        const shopDate =
            document.getElementById(
                'shop-date'
            );


        if (shopDate) {

            shopDate.textContent =
                formatShopDate(
                    shop.shopDate ||
                    shop.detectedAt
                );

        }


        // ==================================
        // DETECTED TIME
        // ==================================

        const detected =
            document.getElementById(
                'shop-detected'
            );


        if (detected) {

            detected.textContent =
                shop.detectedAt
                    ? `Detected ${formatDate(shop.detectedAt)}`
                    : 'Detection time unavailable';

        }


        // ==================================
        // CURRENT ITEMS
        // ==================================

        const currentItems =
            Array.isArray(
                shop.currentItems
            )
                ? shop.currentItems
                : [];


        // ==================================
        // NEW ITEMS
        // ==================================

        const newItems =
            Array.isArray(
                shop.releasedToday
            )
                ? shop.releasedToday
                : [];


        // ==================================
        // REMOVED ITEMS
        // ==================================

        const removedItems =
            Array.isArray(
                shop.removedToday
            )
                ? shop.removedToday
                : [];


        // ==================================
        // TOTAL
        // ==================================

        const totalElement =
            document.getElementById(
                'shop-total'
            );


        if (totalElement) {

            totalElement.textContent =
                currentItems.length;

        }


        // ==================================
        // CURRENT COUNT
        // ==================================

        const currentCount =
            document.getElementById(
                'current-items-count'
            );


        if (currentCount) {

            currentCount.textContent =
                `${currentItems.length} ${
                    currentItems.length === 1
                        ? 'item'
                        : 'items'
                }`;

        }


        // ==================================
        // NEW COUNT
        // ==================================

        const newCount =
            document.getElementById(
                'new-items-count'
            );


        if (newCount) {

            newCount.textContent =
                `${newItems.length} ${
                    newItems.length === 1
                        ? 'item'
                        : 'items'
                }`;

        }


        // ==================================
        // REMOVED COUNT
        // ==================================

        const removedCount =
            document.getElementById(
                'removed-items-count'
            );


        if (removedCount) {

            removedCount.textContent =
                `${removedItems.length} ${
                    removedItems.length === 1
                        ? 'item'
                        : 'items'
                }`;

        }


        // ==================================
        // RENDER CURRENT SHOP
        // ==================================

        renderShopItems(
            'current-items',
            currentItems,
            'current'
        );


        // ==================================
        // RENDER NEW
        // ==================================

        renderShopItems(
            'new-items',
            newItems,
            'new'
        );


        // ==================================
        // RENDER REMOVED
        // ==================================

        renderShopItems(
            'removed-items',
            removedItems,
            'removed'
        );


        loading.style.display =
            'none';


        content.style.display =
            'block';


    } catch (error) {

        console.error(
            'Failed to load Daily Shop:',
            error
        );


        loading.textContent =
            'Failed to load Daily Shop data.';

    }

}


// ==========================================
// SHOP DATE
// ==========================================

function formatShopDate(
    value
) {

    if (!value) {

        return 'Current Shop';

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleDateString(
        undefined,
        {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }
    );

}


// ==========================================
// RENDER SHOP ITEMS
// ==========================================

function renderShopItems(
    containerId,
    items,
    type
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) {

        return;

    }


    if (
        !items ||
        items.length === 0
    ) {


        let message =
            'No items.';


        if (
            type === 'current'
        ) {

            message =
                'No current shop items.';

        }


        if (
            type === 'new'
        ) {

            message =
                'No new items.';

        }


        if (
            type === 'removed'
        ) {

            message =
                'No removed items.';

        }


        container.innerHTML = `

            <div class="settings-empty">

                ${message}

            </div>

        `;


        return;

    }


    container.innerHTML =
        items.map(
            item =>
                createShopItemCard(
                    item,
                    type
                )
        ).join('');

}


// ==========================================
// SHOP ITEM CARD
// ==========================================

function createShopItemCard(
    item,
    type
) {


    const name =
        item.name ||
        item.displayName ||
        item.title ||
        item.id ||
        'Unknown Item';


    const image =
        item.image ||
        item.icon ||
        item.iconUrl ||
        item.images?.featured ||
        item.images?.icon ||
        item.images?.small ||
        null;


    const price =
        item.price ??
        item.finalPrice ??
        item.cost ??
        null;


    const rarity =
        item.rarity?.displayValue ||
        item.rarity ||
        '';


    const typeLabel =
        type === 'new'
            ? 'NEW'
            : type === 'removed'
                ? 'REMOVED'
                : 'IN SHOP';


    return `

        <div class="shop-item-card">


            <div class="shop-item-image">


                ${
                    image

                        ? `

                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(name)}"
                                loading="lazy"
                            >

                        `

                        : `

                            <div class="shop-no-image">

                                NO IMAGE

                            </div>

                        `
                }


                <span class="shop-item-badge">

                    ${typeLabel}

                </span>


            </div>


            <div class="shop-item-info">


                <h4>

                    ${escapeHtml(name)}

                </h4>


                ${
                    rarity

                        ? `

                            <span class="shop-rarity">

                                ${escapeHtml(
                                    rarity
                                )}

                            </span>

                        `

                        : ''

                }


                ${
                    price !== null

                        ? `

                            <span class="shop-price">

                                ${escapeHtml(
                                    price
                                )}

                                V-Bucks

                            </span>

                        `

                        : ''

                }


            </div>


        </div>

    `;

}


// ==========================================
// LOAD SERVERS
// ==========================================

async function loadServers() {

    const select =
        document.getElementById(
            'server-select'
        );


    if (!select) {

        return;

    }

    const previousGuildId =
        select.value;

    try {

        const response =
            await fetch(
                '/api/servers'
            );


        const data =
            await response.json();


        if (
            !data.success ||
            !data.servers ||
            data.servers.length === 0
        ) {

            select.innerHTML = `

                <option value="">

                    No configured servers

                </option>

            `;


            return;

        }


        select.innerHTML =
            '';


        data.servers.forEach(
            server => {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    server.guildId;


                option.textContent =
                    server.accessible
                        ? server.name
                        : `${server.name} — unavailable`;


                option.disabled =
                    !server.accessible;


                select.appendChild(
                    option
                );

            }
        );


        select.onchange =
            () => {

                loadServerConfig(
                    select.value
                );

            };


        const selectedServer =
            data.servers.find(
                server =>
                    server.accessible &&
                    server.guildId === previousGuildId
            ) ||
            data.servers.find(
                server =>
                    server.accessible
            );


        if (selectedServer) {

            select.value =
                selectedServer.guildId;


            loadServerConfig(
                selectedServer.guildId
            );

        }


    } catch (error) {

        console.error(
            'Failed to load servers:',
            error
        );


        select.innerHTML = `

            <option value="">

                Failed to load servers

            </option>

        `;

    }

}


// ==========================================
// LOAD SERVER CONFIG
// ==========================================

async function loadServerConfig(
    guildId
) {

    const container =
        document.getElementById(
            'server-settings-content'
        );


    if (!container) {

        return;

    }


    if (!guildId) {

        container.innerHTML = `

            <div class="settings-empty">

                Select a server to view its
                configuration.

            </div>

        `;


        return;

    }


    container.innerHTML = `

        <div class="settings-empty">

            Loading server configuration...

        </div>

    `;


    try {

        const response =
            await fetch(
                `/api/servers/${guildId}`
            );


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.error
            );

        }


        const config =
            data.config || {};


        container.innerHTML = `

            <div class="server-header">


                ${
                    data.icon

                        ? `

                            <img
                                src="${escapeHtml(data.icon)}"
                                alt=""
                                class="server-icon"
                            >

                        `

                        : `

                            <div
                                class="server-icon-placeholder"
                            >

                                ${escapeHtml(
                                    data.name
                                        .charAt(0)
                                        .toUpperCase()
                                )}

                            </div>

                        `
                }


                <div>

                    <p class="eyebrow">

                        SELECTED SERVER

                    </p>


                    <h3>

                        ${escapeHtml(
                            data.name
                        )}

                    </h3>

                </div>


            </div>



            <div class="settings-section">


                <div class="settings-section-header">

                    <div>

                        <p class="eyebrow">

                            DAILY SHOP

                        </p>

                        <h3>

                            Shop Configuration

                        </h3>

                    </div>

                </div>



                <div class="settings-grid">


                    <div class="setting-card">

                        <span>

                            SHOP CHANNEL

                        </span>


                        <select
                            id="channelId"
                            class="setting-select"
                        >

                            ${createChannelOptions(
                                data.channels,
                                config.channelId
                            )}

                        </select>

                    </div>



                    <div class="setting-card">

                        <span>

                            SHOP ROLE

                        </span>


                        <select
                            id="roleId"
                            class="setting-select"
                        >

                            ${createRoleOptions(
                                data.roles,
                                config.roleId
                            )}

                        </select>

                    </div>


                </div>


            </div>



            <div class="settings-section">


                <div class="settings-section-header">

                    <div>

                        <p class="eyebrow">

                            NEWS + LEAKS

                        </p>

                        <h3>

                            Updates Configuration

                        </h3>

                    </div>

                </div>



                <div class="settings-grid">


                    <div class="setting-card">

                        <span>

                            UPDATES CHANNEL

                        </span>


                        <select
                            id="updatesChannelId"
                            class="setting-select"
                        >

                            ${createChannelOptions(
                                data.channels,
                                config.updatesChannelId
                            )}

                        </select>

                    </div>



                    <div class="setting-card">

                        <span>

                            UPDATES ROLE

                        </span>


                        <select
                            id="updatesRoleId"
                            class="setting-select"
                        >

                            ${createRoleOptions(
                                data.roles,
                                config.updatesRoleId
                            )}

                        </select>

                    </div>


                </div>


            </div>



            <div class="settings-section">


                <div class="settings-section-header">

                    <div>

                        <p class="eyebrow">

                            MODERATION

                        </p>

                        <h3>

                            Logging Configuration

                        </h3>

                    </div>

                </div>



                <div class="settings-grid">


                    <div class="setting-card">

                        <span>

                            LOGGING CHANNEL

                        </span>


                        <select
                            id="logsChannelId"
                            class="setting-select"
                        >

                            ${createChannelOptions(
                                data.channels,
                                config.logsChannelId
                            )}

                        </select>

                    </div>


                </div>


            </div>



            <div class="settings-actions">


                <button
                    class="save-button"
                    onclick="saveServerConfig('${guildId}')"
                >

                    Save Changes

                </button>


                <span
                    id="save-status"
                    class="save-status"
                ></span>


            </div>

        `;


    } catch (error) {

        console.error(
            'Failed to load server configuration:',
            error
        );


        container.innerHTML = `

            <div class="settings-empty">

                ${escapeHtml(
                    error.message ||
                    'Failed to load server configuration.'
                )}

            </div>

        `;

    }

}


// ==========================================
// CHANNEL OPTIONS
// ==========================================

function createChannelOptions(
    channels,
    selectedId
) {

    let html = `

        <option value="">

            Not configured

        </option>

    `;


    channels.forEach(
        channel => {

            const selected =
                channel.id === selectedId
                    ? 'selected'
                    : '';


            html += `

                <option
                    value="${channel.id}"
                    ${selected}
                >

                    #${escapeHtml(
                        channel.name
                    )}

                </option>

            `;

        }
    );


    return html;

}


// ==========================================
// ROLE OPTIONS
// ==========================================

function createRoleOptions(
    roles,
    selectedId
) {

    let html = `

        <option value="">

            Not configured

        </option>

    `;


    roles.forEach(
        role => {

            const selected =
                role.id === selectedId
                    ? 'selected'
                    : '';


            html += `

                <option
                    value="${role.id}"
                    ${selected}
                >

                    @${escapeHtml(
                        role.name
                    )}

                </option>

            `;

        }
    );


    return html;

}


// ==========================================
// SAVE SERVER CONFIG
// ==========================================

async function saveServerConfig(
    guildId
) {

    const status =
        document.getElementById(
            'save-status'
        );


    if (!status) {

        return;

    }


    status.textContent =
        'Saving...';


    try {

        const body = {

            channelId:
                document.getElementById(
                    'channelId'
                )?.value ||
                null,


            roleId:
                document.getElementById(
                    'roleId'
                )?.value ||
                null,


            updatesChannelId:
                document.getElementById(
                    'updatesChannelId'
                )?.value ||
                null,


            updatesRoleId:
                document.getElementById(
                    'updatesRoleId'
                )?.value ||
                null,


            logsChannelId:
                document.getElementById(
                    'logsChannelId'
                )?.value ||
                null

        };


        const response =
            await fetch(
                `/api/servers/${guildId}`,
                {

                    method:
                        'PUT',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify(
                            body
                        )

                }
            );


        const data =
            await response.json();

        const botAvatar =
    document.getElementById('bot-avatar');

const botAvatarPlaceholder =
    document.getElementById('bot-avatar-placeholder');

if (botAvatar && data.avatar) {
    botAvatar.src = data.avatar;
    botAvatar.style.display = 'block';

    if (botAvatarPlaceholder) {
        botAvatarPlaceholder.style.display = 'none';
    }
}    


        if (!data.success) {

            throw new Error(
                data.error ||
                'Failed to save configuration.'
            );

        }


        status.textContent =
            'Saved successfully.';


        setTimeout(
            () => {

                status.textContent =
                    '';

            },
            3000
        );


    } catch (error) {

        console.error(
            'Failed to save configuration:',
            error
        );


        status.textContent =
            error.message ||
            'Failed to save.';

    }

}

// ==========================================
// LOAD NEW COSMETICS
// ==========================================

async function loadNewCosmetics() {

    const loading =
        document.getElementById(
            'cosmetics-loading'
        );

    const empty =
        document.getElementById(
            'cosmetics-empty'
        );

    const results =
        document.getElementById(
            'cosmetics-results'
        );

    const status =
        document.getElementById(
            'cosmetics-search-status'
        );


    if (
        !loading ||
        !empty ||
        !results
    ) {
        return;
    }


    loading.style.display =
        'flex';

    empty.style.display =
        'none';

    results.innerHTML =
        '';


    if (status) {

        status.style.display =
            'none';

    }


    try {

        const response =
            await fetch(
                '/api/cosmetics/new'
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                'Failed to load new cosmetics.'
            );

        }


        const cosmetics =
            Array.isArray(
                data.cosmetics
            )
                ? data.cosmetics
                : [];


        if (
            cosmetics.length === 0
        ) {

            empty.innerHTML = `

                <div class="cosmetics-empty-icon">
                    ✦
                </div>

                <h4>
                    No new cosmetics
                </h4>

                <p>
                    There are currently no new cosmetics to display.
                </p>

            `;

            empty.style.display =
                'flex';

            return;

        }


        if (status) {

            status.textContent =
                `${cosmetics.length} new cosmetics`;

            status.style.display =
                'block';

        }


        results.innerHTML =
            cosmetics
                .map(
                    cosmetic =>
                        createCosmeticCard(
                            cosmetic
                        )
                )
                .join('');


    } catch (error) {

        console.error(
            'Failed to load new cosmetics:',
            error
        );


        empty.innerHTML = `

            <div class="cosmetics-empty-icon">
                !
            </div>

            <h4>
                Failed to load cosmetics
            </h4>

            <p>
                ${escapeHtml(
                    error.message ||
                    'Something went wrong.'
                )}
            </p>

        `;

        empty.style.display =
            'flex';


    } finally {

        loading.style.display =
            'none';

    }

}

// ==========================================
// COSMETICS SEARCH
// ==========================================

let cosmeticsSearchReady = false;


function setupCosmeticsSearch() {

    if (cosmeticsSearchReady) {
        return;
    }


    const input =
        document.getElementById(
            'cosmetic-search'
        );


    const button =
        document.getElementById(
            'cosmetic-search-button'
        );


    if (!input || !button) {
        return;
    }


    cosmeticsSearchReady = true;


    button.addEventListener(
        'click',
        () => {

            searchCosmeticsDashboard(
                input.value
            );

        }
    );


    input.addEventListener(
        'keydown',
        event => {

            if (
                event.key === 'Enter'
            ) {

                searchCosmeticsDashboard(
                    input.value
                );

            }

        }
    );

}


// ==========================================
// SEARCH COSMETICS
// ==========================================

async function searchCosmeticsDashboard(
    search
) {

    const query =
        String(search || '').trim();


    const loading =
        document.getElementById(
            'cosmetics-loading'
        );


    const empty =
        document.getElementById(
            'cosmetics-empty'
        );


    const results =
        document.getElementById(
            'cosmetics-results'
        );


    if (
        !loading ||
        !empty ||
        !results
    ) {

        return;

    }


    if (query.length < 2) {

        empty.textContent =
            'Enter at least 2 characters.';


        empty.style.display =
            'block';


        results.innerHTML =
            '';


        return;

    }


    loading.style.display =
        'block';


    empty.style.display =
        'none';


    results.innerHTML =
        '';


    try {

        const response =
            await fetch(
                `/api/cosmetics?search=${encodeURIComponent(query)}`
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                'Search failed.'
            );

        }


        const cosmetics =
            Array.isArray(
                data.cosmetics
            )
                ? data.cosmetics
                : [];


        if (
            cosmetics.length === 0
        ) {

            empty.textContent =
                `No cosmetics found for "${query}".`;


            empty.style.display =
                'block';


            return;

        }


        results.innerHTML =
            cosmetics
                .map(
                    cosmetic =>
                        createCosmeticCard(
                            cosmetic
                        )
                )
                .join('');


    } catch (error) {

        console.error(
            'Cosmetic search error:',
            error
        );


        empty.textContent =
            'Failed to search cosmetics.';


        empty.style.display =
            'block';


    } finally {

        loading.style.display =
            'none';

    }

}


// ==========================================
// COSMETIC CARD
// ==========================================

function createCosmeticCard(cosmetic) {

    const name =
        cosmetic.name ||
        cosmetic.displayName ||
        cosmetic.id ||
        'Unknown Cosmetic';

    const image =
        cosmetic.images?.featured ||
        cosmetic.images?.icon ||
        cosmetic.images?.smallIcon ||
        cosmetic.images?.small ||
        null;

    const rarity =
        cosmetic.rarity?.displayValue ||
        cosmetic.rarity ||
        '';

    const type =
        cosmetic.type?.displayValue ||
        cosmetic.type ||
        '';

    const id =
        cosmetic.id ||
        '';

    // Store the full cosmetic object
    const cosmeticKey =
        id ||
        `${name}-${Math.random().toString(36).slice(2)}`;

    window.cosmeticDetailsCache =
        window.cosmeticDetailsCache || new Map();

    window.cosmeticDetailsCache.set(
        cosmeticKey,
        cosmetic
    );

    return `

        <div
            class="shop-item-card cosmetic-card"
            data-cosmetic-id="${escapeHtml(cosmeticKey)}"
            style="cursor: pointer;"
        >

            <div class="shop-item-image">

                ${
                    image

                        ? `

                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(name)}"
                                loading="lazy"
                            >

                        `

                        : `

                            <div class="shop-no-image">
                                NO IMAGE
                            </div>

                        `
                }

            </div>


            <div class="shop-item-info">

                <h4>
                    ${escapeHtml(name)}
                </h4>

                ${
                    type

                        ? `

                            <span class="shop-rarity">
                                ${escapeHtml(type)}
                            </span>

                        `

                        : ''
                }

                ${
                    rarity

                        ? `

                            <span class="shop-rarity">
                                ${escapeHtml(rarity)}
                            </span>

                        `

                        : ''
                }

                ${
                    id

                        ? `

                            <small class="cosmetic-id">
                                ${escapeHtml(id)}
                            </small>

                        `

                        : ''
                }

            </div>

        </div>

    `;
}

// ==========================================
// COSMETIC CARD CLICK
// ==========================================

document.addEventListener('click', function (event) {

    const card =
        event.target.closest('.cosmetic-card');

    if (!card) return;

    const cosmeticId =
        card.dataset.cosmeticId;

    const cosmetic =
        window.cosmeticDetailsCache?.get(cosmeticId);

    if (!cosmetic) {
        console.warn(
            'Cosmetic data not found:',
            cosmeticId
        );
        return;
    }

    openCosmeticDetails(cosmetic);
});

// ==========================================
// COSMETIC DETAILS MODAL
// ==========================================

function openCosmeticDetails(cosmetic) {

    // Remove existing modal
    document
        .getElementById('cosmetic-details-modal')
        ?.remove();


    const name =
        cosmetic.name ||
        cosmetic.displayName ||
        cosmetic.id ||
        'Unknown Cosmetic';

    const image =
        cosmetic.images?.featured ||
        cosmetic.images?.icon ||
        cosmetic.images?.smallIcon ||
        cosmetic.images?.small ||
        null;

    const rarity =
        cosmetic.rarity?.displayValue ||
        cosmetic.rarity ||
        'Unknown';

    const type =
        cosmetic.type?.displayValue ||
        cosmetic.type ||
        'Unknown';

    const id =
        cosmetic.id ||
        'Unknown';

    const description =
        cosmetic.description ||
        cosmetic.introduction?.text ||
        'No description available.';


    const modal =
        document.createElement('div');

    modal.id =
        'cosmetic-details-modal';

    modal.className =
        'cosmetic-details-overlay';


    modal.innerHTML = `

        <div class="cosmetic-details-card">

            <button
                class="cosmetic-details-close"
                type="button"
            >
                ×
            </button>


            <div class="cosmetic-details-image">

                ${
                    image

                        ? `

                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(name)}"
                            >

                        `

                        : `

                            <div class="shop-no-image">
                                NO IMAGE
                            </div>

                        `
                }

            </div>


            <div class="cosmetic-details-content">

                <span class="cosmetic-details-type">
                    ${escapeHtml(type)}
                </span>

                <h2>
                    ${escapeHtml(name)}
                </h2>

                <span class="cosmetic-details-rarity">
                    ${escapeHtml(rarity)}
                </span>

                <p class="cosmetic-details-description">
                    ${escapeHtml(description)}
                </p>

                <div class="cosmetic-details-id">
                    ID:
                    <span>${escapeHtml(id)}</span>
                </div>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    // Close button
    modal
        .querySelector('.cosmetic-details-close')
        .addEventListener('click', () => {
            modal.remove();
        });


    // Click outside modal
    modal.addEventListener('click', (event) => {

        if (event.target === modal) {
            modal.remove();
        }

    });


    // ESC key
    document.addEventListener(
        'keydown',
        function closeCosmeticModal(event) {

            if (event.key !== 'Escape') return;

            modal.remove();

            document.removeEventListener(
                'keydown',
                closeCosmeticModal
            );

        }
    );

}

// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHtml(
    value
) {

    return String(value)

        .replace(
            /&/g,
            '&amp;'
        )

        .replace(
            /</g,
            '&lt;'
        )

        .replace(
            />/g,
            '&gt;'
        )

        .replace(
            /"/g,
            '&quot;'
        )

        .replace(
            /'/g,
            '&#039;'
        );

}


// ==========================================
// START
// ==========================================

// ==========================================
// LEAKS
// ==========================================

async function loadLeaks() {
    const container =
        document.getElementById(
            'leaks-container'
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="loading">
            Loading leaks...
        </div>
    `;

    try {
        const response =
            await fetch('/api/leaks');

        const data =
            await response.json();

        if (
            !data.success ||
            !Array.isArray(data.leaks) ||
            data.leaks.length === 0
        ) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No leaks detected</h3>
                    <p>
                        No recent Fortnite leaks
                        were found.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            data.leaks
                .map(renderLeak)
                .join('');

    } catch (error) {
        console.error(
            '❌ Failed to load leaks:',
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                <h3>Failed to load leaks</h3>
                <p>
                    Something went wrong while
                    loading the leak tracker.
                </p>
            </div>
        `;
    }
}

function renderLeak(leak) {
    const images = Array.isArray(leak.images)
        ? leak.images
        : [];

    const videos = Array.isArray(leak.videos)
        ? leak.videos
        : [];

    const media = images.length
        ? `
            <div class="leak-media">
                ${images
                    .map(
                        image => `
                            <img
                                src="${escapeHtml(image)}"
                                alt="Fortnite leak"
                                loading="lazy"
                            >
                        `
                    )
                    .join('')}
            </div>
        `
        : videos.length
            ? `
                <div class="leak-media">
                    ${videos
                        .map(
                            video => `
                                <video
                                    src="${escapeHtml(video)}"
                                    controls
                                    preload="metadata"
                                ></video>
                            `
                        )
                        .join('')}
                </div>
            `
            : '';

    const date = leak.date
        ? new Date(leak.date).toLocaleString()
        : 'Unknown date';

    return `
        <article class="leak-card">

            <div class="leak-card-header">

                <div class="leak-user">

                    <div class="leak-avatar">
                        ${escapeHtml(
                            (leak.displayName || leak.username || '?')
                                .charAt(0)
                                .toUpperCase()
                        )}
                    </div>

                    <div>
                        <strong>
                            ${escapeHtml(
                                leak.displayName ||
                                leak.username ||
                                'Unknown'
                            )}
                        </strong>

                        <span>
                            @${escapeHtml(
                                leak.username || 'unknown'
                            )}
                        </span>
                    </div>

                </div>

                <span class="leak-date">
                    ${escapeHtml(date)}
                </span>

            </div>

            <div class="leak-text">
                ${escapeHtml(leak.text || '')}
            </div>

            ${media}

            <div class="leak-card-footer">

                <span class="leak-source">
                    X / Twitter
                </span>

                ${
                    leak.url
                        ? `
                            <a
                                href="${escapeHtml(leak.url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="leak-link"
                            >
                                View Post
                            </a>
                        `
                        : ''
                }

            </div>

        </article>
    `;
}


// ==========================================
// GIVEAWAYS
// ==========================================

async function loadGiveaways() {

    const activeContainer =
        document.getElementById(
            'active-giveaways'
        );

    const historyContainer =
        document.getElementById(
            'giveaway-history'
        );

    if (
        !activeContainer ||
        !historyContainer
    ) {
        return;
    }

    activeContainer.innerHTML = `
        <div class="giveaway-loading">
            Loading giveaways...
        </div>
    `;

    historyContainer.innerHTML = `
        <div class="giveaway-loading">
            Loading history...
        </div>
    `;

    try {

        /*
         * This expects the dashboard API to return:
         *
         * {
         *   success: true,
         *   giveaways: [...]
         * }
         */

        const response =
            await fetch(
                '/api/giveaways'
            );

        if (!response.ok) {
            throw new Error(
                `Giveaway API returned ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            !data.success ||
            !Array.isArray(data.giveaways)
        ) {
            throw new Error(
                data.error ||
                'Invalid giveaway response.'
            );
        }

        const giveaways =
            data.giveaways;

        const active =
            giveaways.filter(
                giveaway =>
                    giveaway.status === 'active'
            );

        const history =
            giveaways.filter(
                giveaway =>
                    giveaway.status !== 'active'
            );

        renderActiveGiveaways(
            active
        );

        renderGiveawayHistory(
            history
        );

    } catch (error) {

        console.error(
            '❌ Failed to load giveaways:',
            error
        );

        activeContainer.innerHTML = `
            <div class="giveaway-empty">
                <div class="giveaway-empty-icon">
                    ⚠️
                </div>

                <h3>
                    Failed to load giveaways
                </h3>

                <p>
                    Something went wrong while
                    loading giveaway data.
                </p>
            </div>
        `;

        historyContainer.innerHTML = '';

    }
}

// ==========================================
// ACTIVE GIVEAWAYS
// ==========================================

function renderActiveGiveaways(
    giveaways
) {

    const container =
        document.getElementById(
            'active-giveaways'
        );

    if (!container) {
        return;
    }

    if (
        !giveaways ||
        giveaways.length === 0
    ) {

        container.innerHTML = `
            <div class="giveaway-empty">

                <div class="giveaway-empty-icon">
                    🎁
                </div>

                <h3>
                    No active giveaways
                </h3>

                <p>
                    Start a giveaway from Discord
                    to see it appear here.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        giveaways
            .map(
                renderGiveawayCard
            )
            .join('');

    startGiveawayCountdowns();
}

// ==========================================
// COUNTDOWNS
// ==========================================

function formatGiveawayCountdown(
    endTime
) {

    const remaining =
        endTime - Date.now();

    if (
        remaining <= 0
    ) {
        return 'Ended';
    }

    const totalSeconds =
        Math.floor(
            remaining / 1000
        );

    const days =
        Math.floor(
            totalSeconds / 86400
        );

    const hours =
        Math.floor(
            (totalSeconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        totalSeconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}


function startGiveawayCountdowns() {

    if (
        window.giveawayCountdownTimer
    ) {
        clearInterval(
            window.giveawayCountdownTimer
        );
    }

    function update() {

        document
            .querySelectorAll(
                '[data-countdown]'
            )
            .forEach(
                element => {

                    const endTime =
                        Number(
                            element.dataset
                                .countdown
                        );

                    element.textContent =
                        formatGiveawayCountdown(
                            endTime
                        );

                    if (
                        endTime -
                        Date.now()
                        <= 60000
                    ) {
                        element.classList.add(
                            'ending'
                        );
                    }

                }
            );
    }

    update();

    window.giveawayCountdownTimer =
        setInterval(
            update,
            1000
        );
}

// ==========================================
// GIVEAWAY HISTORY
// ==========================================

function renderGiveawayHistory(
    giveaways
) {

    const container =
        document.getElementById(
            'giveaway-history'
        );

    if (!container) {
        return;
    }

    if (
        !giveaways ||
        giveaways.length === 0
    ) {

        container.innerHTML = `
            <div class="giveaway-empty">

                <div class="giveaway-empty-icon">
                    🗂️
                </div>

                <h3>
                    No giveaway history
                </h3>

                <p>
                    Completed giveaways will appear here.
                </p>

            </div>
        `;

        return;
    }

    const sorted =
        [...giveaways].sort(
            (a, b) =>
                (b.endedAt || b.endsAt || 0) -
                (a.endedAt || a.endsAt || 0)
        );

    container.innerHTML =
        sorted
            .slice(0, 10)
            .map(
                giveaway => {

                    const prize =
                        escapeHtml(
                            giveaway.prize ||
                            'Untitled Giveaway'
                        );

                    const entries =
                        Array.isArray(
                            giveaway.entries
                        )
                            ? giveaway.entries.length
                            : 0;

                    const winnerCount =
                        Array.isArray(
                            giveaway.winnerIds
                        )
                            ? giveaway.winnerIds.length
                            : giveaway.winners || 0;

                    const date =
                        giveaway.endedAt ||
                        giveaway.endsAt;

                    const formattedDate =
                        date
                            ? new Date(
                                date
                            ).toLocaleDateString(
                                undefined,
                                {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                }
                            )
                            : 'Unknown date';

                    const status =
                        giveaway.status ===
                        'cancelled'
                            ? 'cancelled'
                            : 'ended';

                    const statusText =
                        status === 'cancelled'
                            ? 'CANCELLED'
                            : 'ENDED';

                    return `
                        <article
                            class="history-card"
                        >

                            <div class="history-main">

                                <div class="history-prize">
                                    ${prize}
                                </div>

                                <div class="history-date">
                                    ${formattedDate}
                                </div>

                            </div>


                            <div class="history-value">

                                <strong>
                                    ${entries}
                                </strong>

                                Entries

                            </div>


                            <div class="history-value">

                                <strong>
                                    ${winnerCount}
                                </strong>

                                Winners

                            </div>


                            <div class="history-status">

                                <span
                                    class="giveaway-status ${status}"
                                >
                                    <span class="status-dot"></span>
                                    ${statusText}
                                </span>

                            </div>

                        </article>
                    `;

                }
            )
            .join('');
}


function renderGiveawayCard(giveaway) {

    const entries =
        Array.isArray(giveaway.entries)
            ? giveaway.entries.length
            : 0;

    const winners =
        giveaway.winners || 1;

    const remaining =
        formatGiveawayRemaining(
            giveaway.endsAt
        );

    return `
        <article class="giveaway-card">

            <div class="giveaway-card-top">
                <div>
                    <span class="giveaway-status active">
                        ACTIVE
                    </span>

                    <h3>
                        ${escapeHtml(
                            giveaway.prize ||
                            'Unknown Prize'
                        )}
                    </h3>

                    <p class="giveaway-server">
                        ${escapeHtml(
                            giveaway.serverName ||
                            'Unknown Server'
                        )}
                    </p>
                </div>

                <div class="giveaway-countdown">
                    <span>ENDS</span>
                    <strong>
                        ${escapeHtml(remaining)}
                    </strong>
                </div>
            </div>

            <div class="giveaway-stats">
                <div>
                    <span>ENTRIES</span>
                    <strong>${entries}</strong>
                </div>

                <div>
                    <span>WINNERS</span>
                    <strong>${winners}</strong>
                </div>

                <div>
                    <span>HOST</span>
                    <strong>
                        ${escapeHtml(
                            giveaway.hostId
                                ? `<@${giveaway.hostId}>`
                                : 'Unknown'
                        )}
                    </strong>
                </div>
            </div>

            <div class="giveaway-actions">
                <button
                    class="giveaway-action end"
                    data-giveaway-action="end"
                    data-giveaway-id="${escapeHtml(giveaway.id)}"
                >
                    End Giveaway
                </button>

                <button
                    class="giveaway-action cancel"
                    data-giveaway-action="cancel"
                    data-giveaway-id="${escapeHtml(giveaway.id)}"
                >
                    Cancel Giveaway
                </button>
            </div>

        </article>
    `;
}


function renderGiveawayHistoryCard(giveaway) {

    const status =
        giveaway.status || 'unknown';

    const winners =
        Array.isArray(giveaway.winnerIds)
            ? giveaway.winnerIds
            : [];

    const winnerText =
        winners.length
            ? winners
                .map(id => `<@${id}>`)
                .join(', ')
            : 'No winners';

    const endedDate =
        giveaway.endedAt
            ? formatDate(giveaway.endedAt)
            : 'No end time';

    return `
        <article class="giveaway-history-card">
            <div>
                <span class="giveaway-status ${escapeHtml(status)}">
                    ${escapeHtml(status.toUpperCase())}
                </span>

                <h4>
                    ${escapeHtml(
                        giveaway.prize ||
                        'Unknown Prize'
                    )}
                </h4>

                <p>
                    ${escapeHtml(
                        giveaway.serverName ||
                        'Unknown Server'
                    )}
                </p>
            </div>

            <div class="giveaway-history-meta">
                <span>
                    Entries: ${
                        Array.isArray(giveaway.entries)
                            ? giveaway.entries.length
                            : 0
                    }
                </span>

                <span>
                    Winners: ${escapeHtml(winnerText)}
                </span>

                <span>
                    ${escapeHtml(endedDate)}
                </span>
            </div>
        </article>
    `;
}


function formatGiveawayRemaining(endTime) {

    if (!endTime) {
        return 'Unknown';
    }

    const remaining =
        Number(endTime) - Date.now();

    if (remaining <= 0) {
        return 'Ended';
    }

    const totalSeconds =
        Math.floor(remaining / 1000);

    const days =
        Math.floor(totalSeconds / 86400);

    const hours =
        Math.floor(
            (totalSeconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    if (days) {
        return `${days}d ${hours}h`;
    }

    if (hours) {
        return `${hours}h ${minutes}m`;
    }

    return `${Math.max(minutes, 0)}m`;
}


async function handleGiveawayAction(
    action,
    giveawayId
) {

    const button =
        document.querySelector(
            `[data-giveaway-action="${action}"][data-giveaway-id="${CSS.escape(giveawayId)}"]`
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            action === 'end'
                ? 'Ending...'
                : 'Cancelling...';
    }

    if (action === 'cancel') {
        const confirmed =
            window.confirm(
                'Cancel this giveaway? This cannot be undone.'
            );

        if (!confirmed) {
            if (button) {
                button.disabled = false;
                button.textContent =
                    'Cancel Giveaway';
            }
            return;
        }
    }

    if (action === 'end') {
        const confirmed =
            window.confirm(
                'End this giveaway now and select the winners?'
            );

        if (!confirmed) {
            if (button) {
                button.disabled = false;
                button.textContent =
                    'End Giveaway';
            }
            return;
        }
    }

    try {

        const response =
            await fetch(
                `/api/giveaways/${encodeURIComponent(giveawayId)}/${action}`,
                {
                    method: 'POST'
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                `Failed to ${action} giveaway.`
            );
        }

        await loadGiveaways();

    } catch (error) {

        console.error(
            `❌ Failed to ${action} giveaway:`,
            error
        );

        alert(error.message);

        await loadGiveaways();
    }
}


// ==========================================
// STATUS
// ==========================================

loadStatus();

setInterval(
    loadStatus,
    5000
);
loadStatus();

setInterval(
    loadStatus,
    5000
);


// ==========================================
// GIVEAWAY ACTIONS
// ==========================================

document.addEventListener(
    'click',
    event => {

        const button =
            event.target.closest(
                '[data-giveaway-action]'
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset.giveawayAction;

        const giveawayId =
            button.dataset.giveawayId;

        if (!action || !giveawayId) {
            return;
        }

        handleGiveawayAction(
            action,
            giveawayId
        );
    }
);


// ==========================================
// GIVEAWAY REFRESH
// ==========================================

const refreshGiveawaysButton =
    document.getElementById(
        'refresh-giveaways'
    );

if (refreshGiveawaysButton) {
    refreshGiveawaysButton.addEventListener(
        'click',
        loadGiveaways
    );
}

// ==========================================
// LEAK REFRESH
// ==========================================

const refreshLeaksButton =
    document.getElementById(
        'refresh-leaks'
    );

if (refreshLeaksButton) {
    refreshLeaksButton.addEventListener(
        'click',
        loadLeaks
    );
}
// =========================================================
// MODERATION UI
// =========================================================
function setupModerationUI() {

    document.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-mod-action]'
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.modAction;

            if (!action) {
                return;
            }

            console.log(
                `Moderation button clicked: ${action}`
            );

            openModerationAction(action);

        }
    );


    const refreshButton =
        document.getElementById(
            'refresh-moderation'
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            'click',
            () => {
                loadModeration();
            }
        );

    }

}
setupModerationUI();

let moderationSelectedMember = null;

async function openModerationAction(action) {

     console.log('🔥 OPEN MODAL STARTED:', action);

    const names = {
        warn: 'Warn Member',
        kick: 'Kick Member',
        ban: 'Ban Member',
        timeout: 'Timeout Member',
        clear: 'Clear Messages',
        lock: 'Lock Channel'
    };

    const icons = {
        warn: '⚠️',
        kick: '👢',
        ban: '🔨',
        timeout: '⏱️',
        clear: '🧹',
        lock: '🔒'
    };

    const title =
        names[action] || 'Moderation Action';

    const guildId =
        document.getElementById('server-select')?.value;

    if (!guildId) {
        alert('Select a server first.');
        return;
    }


    // Remove existing modal

    document
        .getElementById('moderation-modal')
        ?.remove();


    // ==========================================
    // CREATE MODAL
    // ==========================================

    const modal =
        document.createElement('div');

    modal.id =
        'moderation-modal';

    modal.className =
        'moderation-modal-overlay';


    modal.innerHTML = `

        <div class="moderation-modal">

            <div class="moderation-modal-header">

                <div class="moderation-modal-title">

                    <div class="moderation-modal-icon">
                        ${icons[action]}
                    </div>

                    <div>

                        <span>
                            SERVER MODERATION
                        </span>

                        <h2>
                            ${title}
                        </h2>

                    </div>

                </div>


                <button
                    class="moderation-modal-close"
                    id="close-moderation-modal"
                >
                    ×
                </button>

            </div>


            <div
                class="moderation-modal-body"
                id="moderation-modal-body"
            >

                <div class="moderation-modal-loading">
                    Loading...
                </div>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    // ==========================================
    // CLOSE
    // ==========================================

    document
        .getElementById('close-moderation-modal')
        .addEventListener(
            'click',
            () => modal.remove()
        );


    modal.addEventListener(
        'click',
        event => {

            if (
                event.target === modal
            ) {
                modal.remove();
            }

        }
    );


    const body =
        document.getElementById(
            'moderation-modal-body'
        );


    // ==========================================
    // MEMBER ACTIONS
    // ==========================================

    if (
        ['warn', 'kick', 'ban', 'timeout']
            .includes(action)
    ) {

        body.innerHTML = `

            <div class="mod-form-group">

                <label>
                    MEMBER
                </label>

                <div class="mod-member-search">

                    <input
                        type="text"
                        id="mod-member-search"
                        placeholder="Search username..."
                        autocomplete="off"
                    >

                    <div
                        id="mod-member-results"
                        class="mod-member-results"
                    ></div>

                </div>

            </div>


            ${
                action === 'timeout'
                    ? `
                        <div class="mod-form-group">

                            <label>
                                DURATION
                            </label>

                            <select
                                id="mod-timeout-duration"
                                class="mod-input"
                            >
                                <option value="60">
                                    1 minute
                                </option>

                                <option value="300">
                                    5 minutes
                                </option>

                                <option value="600">
                                    10 minutes
                                </option>

                                <option value="1800">
                                    30 minutes
                                </option>

                                <option value="3600">
                                    1 hour
                                </option>

                                <option value="86400">
                                    1 day
                                </option>

                                <option value="604800">
                                    7 days
                                </option>

                            </select>

                        </div>
                    `
                    : ''
            }


            <div class="mod-form-group">

                <label>
                    REASON
                </label>

                <textarea
                    id="mod-reason"
                    class="mod-input mod-textarea"
                    placeholder="Enter a reason..."
                    maxlength="500"
                ></textarea>

            </div>


            <div class="moderation-modal-footer">

                <button
                    class="mod-cancel-button"
                    id="mod-cancel"
                >
                    Cancel
                </button>

                <button
                    class="mod-action-button"
                    id="mod-confirm"
                    disabled
                >
                    ${title}
                </button>

            </div>

        `;


        const searchInput =
            document.getElementById(
                'mod-member-search'
            );

        const results =
            document.getElementById(
                'mod-member-results'
            );

        const confirm =
            document.getElementById(
                'mod-confirm'
            );


        searchInput.addEventListener(
            'input',
            async () => {

                const query =
                    searchInput.value.trim();


                moderationSelectedMember =
                    null;

                confirm.disabled =
                    true;


                if (query.length < 2) {

                    results.innerHTML =
                        '';

                    return;

                }


                results.innerHTML = `
                    <div class="mod-search-loading">
                        Searching...
                    </div>
                `;


                try {

                    const response =
                        await fetch(
                            `/api/moderation/${encodeURIComponent(guildId)}/members?query=${encodeURIComponent(query)}`
                        );


                    const data =
                        await response.json();


                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            'Search failed.'
                        );
                    }


                    if (
                        !data.members ||
                        data.members.length === 0
                    ) {

                        results.innerHTML = `
                            <div class="mod-no-results">
                                No members found.
                            </div>
                        `;

                        return;

                    }


                    results.innerHTML =
                        data.members
                            .map(member => `

                                <button
                                    type="button"
                                    class="mod-member-result"
                                    data-member-id="${member.id}"
                                >

                                    <img
                                        src="${escapeHtml(member.avatar)}"
                                        alt=""
                                    >

                                    <div>

                                        <strong>
                                            ${escapeHtml(
                                                member.displayName
                                            )}
                                        </strong>

                                        <span>
                                            @${escapeHtml(
                                                member.username
                                            )}
                                        </span>

                                    </div>

                                </button>

                            `)
                            .join('');


                    results
                        .querySelectorAll(
                            '.mod-member-result'
                        )
                        .forEach(memberButton => {

                            memberButton.addEventListener(
                                'click',
                                () => {

                                    const member =
                                        data.members.find(
                                            item =>
                                                item.id ===
                                                memberButton.dataset.memberId
                                        );


                                    moderationSelectedMember =
                                        member;


                                    searchInput.value =
                                        member.displayName;


                                    results.innerHTML = `

                                        <div class="mod-selected-member">

                                            <img
                                                src="${escapeHtml(member.avatar)}"
                                                alt=""
                                            >

                                            <div>

                                                <strong>
                                                    ${escapeHtml(
                                                        member.displayName
                                                    )}
                                                </strong>

                                                <span>
                                                    @${escapeHtml(
                                                        member.username
                                                    )}
                                                </span>

                                            </div>

                                            <b>✓</b>

                                        </div>

                                    `;


                                    confirm.disabled =
                                        false;

                                }
                            );

                        });


                } catch (error) {

                    console.error(
                        'Member search failed:',
                        error
                    );

                    results.innerHTML = `
                        <div class="mod-no-results">
                            Failed to search members.
                        </div>
                    `;

                }

            }
        );


        document
            .getElementById('mod-cancel')
            .addEventListener(
                'click',
                () => modal.remove()
            );


        confirm.addEventListener(
            'click',
            async () => {

                if (!moderationSelectedMember) {
                    alert('Select a member first.');
                    return;
                }

                const reason =
                    document.getElementById(
                        'mod-reason'
                    )?.value.trim() || '';

                const duration =
                    document.getElementById(
                        'mod-timeout-duration'
                    )?.value || null;

                confirm.disabled = true;
                confirm.textContent = 'Working...';

                try {
                    const response =
                        await fetch(
                            `/api/moderation/${encodeURIComponent(guildId)}/action`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },
                                body: JSON.stringify({
                                    action,
                                    memberId:
                                        moderationSelectedMember.id,
                                    reason,
                                    duration
                                })
                            }
                        );

                    const data =
                        await response.json();

                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            'Moderation action failed.'
                        );
                    }

                    modal.remove();

                    alert(
                        data.message ||
                        'Moderation action completed successfully.'
                    );

                    if (typeof loadModeration === 'function') {
                        loadModeration();
                    }

                } catch (error) {
                    console.error(
                        'Moderation action failed:',
                        error
                    );

                    alert(
                        error.message ||
                        'Moderation action failed.'
                    );

                    confirm.disabled = false;
                    confirm.textContent = title;
                }

            }
        );


        return;

    }


    // ==========================================
    // CHANNEL ACTIONS
    // ==========================================

    if (
        action === 'clear' ||
        action === 'lock'
    ) {

        body.innerHTML = `

            <div class="mod-form-group">

                <label>
                    CHANNEL
                </label>

                <select
                    id="mod-channel"
                    class="mod-input"
                >
                    <option value="">
                        Loading channels...
                    </option>
                </select>

            </div>


            ${
                action === 'clear'
                    ? `
                        <div class="mod-form-group">

                            <label>
                                NUMBER OF MESSAGES
                            </label>

                            <input
                                type="number"
                                id="mod-clear-amount"
                                class="mod-input"
                                min="1"
                                max="100"
                                value="50"
                            >

                            <small>
                                Maximum 100 messages per clear.
                            </small>

                        </div>
                    `
                    : ''
            }


            <div class="moderation-modal-footer">

                <button
                    class="mod-cancel-button"
                    id="mod-cancel"
                >
                    Cancel
                </button>

                <button
                    class="mod-action-button"
                    id="mod-confirm"
                    disabled
                >
                    ${title}
                </button>

            </div>

        `;


        const channelSelect =
            document.getElementById(
                'mod-channel'
            );

        const confirm =
            document.getElementById(
                'mod-confirm'
            );


        try {

            const response =
                await fetch(
                    `/api/servers/${encodeURIComponent(guildId)}`
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.error ||
                    'Failed to load channels.'
                );
            }


            const channels =
                Array.isArray(data.channels)
                    ? data.channels
                    : [];


            const textChannels =
                channels.filter(
                    channel =>
                        channel.type === 0 ||
                        channel.type === 'GUILD_TEXT' ||
                        channel.type === 5 ||
                        channel.type === 'GUILD_ANNOUNCEMENT'
                );


            channelSelect.innerHTML =
                '<option value="">Select a channel...</option>' +
                textChannels
                    .map(channel => `
                        <option value="${escapeHtml(channel.id)}">
                            #${escapeHtml(channel.name)}
                        </option>
                    `)
                    .join('');


            channelSelect.addEventListener(
                'change',
                () => {
                    confirm.disabled =
                        !channelSelect.value;
                }
            );


        } catch (error) {

            console.error(
                'Failed to load channels:',
                error
            );

            channelSelect.innerHTML =
                '<option value="">Failed to load channels</option>';

        }


        document
            .getElementById('mod-cancel')
            .addEventListener(
                'click',
                () => modal.remove()
            );


        confirm.addEventListener(
            'click',
            async () => {

                const channelId =
                    channelSelect.value;

                if (!channelId) {
                    alert('Select a channel first.');
                    return;
                }

                const amount =
                    document.getElementById(
                        'mod-clear-amount'
                    )?.value || null;

                confirm.disabled = true;
                confirm.textContent = 'Working...';

                try {
                    const response =
                        await fetch(
                            `/api/moderation/${encodeURIComponent(guildId)}/action`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },
                                body: JSON.stringify({
                                    action,
                                    channelId,
                                    amount
                                })
                            }
                        );

                    const data =
                        await response.json();

                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        throw new Error(
                            data.error ||
                            'Channel action failed.'
                        );
                    }

                    modal.remove();

                    alert(
                        data.message ||
                        'Channel action completed successfully.'
                    );

                    if (typeof loadModeration === 'function') {
                        loadModeration();
                    }

                } catch (error) {
                    console.error(
                        'Channel moderation action failed:',
                        error
                    );

                    alert(
                        error.message ||
                        'Channel action failed.'
                    );

                    confirm.disabled = false;
                    confirm.textContent = title;
                }

            }
        );

    }

}

// ==========================================
// INITIALIZE AUTHENTICATED DASHBOARD
// ==========================================

loadDashboardAuth().then(
    authenticated => {
        if (!authenticated) {
            return;
        }

        loadServers();
        loadStatus();

        setInterval(
            loadStatus,
            5000
        );
    }
);
