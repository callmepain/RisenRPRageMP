const menuAndItemSpace = 0.1078;
const itemSeparatorHeight = 0.045;
const itemWidth = 0.225;
const itemHeight = 0.04;

const highlightColor = [236, 240, 241, 255];
const disabledColor = [163, 159, 148, 255];
const itemIcons = [null, "shop_lock", "shop_tick_icon"];

const SET_TEXT_DROP_SHADOW = "0x7985c5e9307c5d5b";
const SET_TEXT_OUTLINE = "0x39a6925dba332248";

let activeMenus = [];

const loadTextureDictionary = (textureDict) => {
    if (!mp.game.graphics.hasStreamedTextureDictLoaded(textureDict)) {
        mp.game.graphics.requestStreamedTextureDict(textureDict, true);
        while (!mp.game.graphics.hasStreamedTextureDictLoaded(textureDict)) mp.game.wait(0);
    }
}

// thanks to kemperrr
const drawText = (text, position, options) => {
    options = { ...{ align: 1, font: 4, scale: 0.3, outline: true, shadow: true, color: [255, 255, 255, 255] }, ...options };

    const ui = mp.game.ui;
    const font = options.font;
    const scale = options.scale;
    const outline = options.outline;
    const shadow = options.shadow;
    const color = options.color;
    const wordWrap = options.wordWrap;
    const align = options.align;

    ui.setTextEntry("CELL_EMAIL_BCON");
    for (let i = 0; i < text.length; i += 99)
    {
        const subStringText = text.substr(i, Math.min(99, text.length - i));
        mp.game.ui.addTextComponentSubstringPlayerName(subStringText);
    }

    ui.setTextFont(font);
    ui.setTextScale(scale, scale);
    ui.setTextColour(color[0], color[1], color[2], color[3]);

    if (shadow) {
        mp.game.invoke(SET_TEXT_DROP_SHADOW);
        ui.setTextDropshadow(2, 0, 0, 0, 255);
    }

    if (outline) {
        mp.game.invoke(SET_TEXT_OUTLINE);
    }

    switch (align) {
        case 1: {
            ui.setTextCentre(true);
            break;
        }
        case 2: {
            ui.setTextRightJustify(true);
            ui.setTextWrap(0.0, position[0] || 0);
            break;
        }
    }

    if (wordWrap) {
        ui.setTextWrap(0.0, (position[0] || 0) + wordWrap);
    }

    ui.drawText(position[0] || 0, position[1] || 0);
}

// https://stackoverflow.com/a/42761393
const paginate = (array, page_size, page_number) => {
    --page_number; // because pages logically start with 1, but technically with 0
    return array.slice(page_number * page_size, (page_number + 1) * page_size);
}

class BasicMenu {
    constructor(title, x, y, bannerLib = "commonmenu", bannerSprite = "interaction_bgd", callbacks = null) {
        this.title = title;
        this.x = x;
        this.y = y;
        this.items = [];
        this._visible = false;
        this.hoverItem = -1;
        this.disableESC = false;
        this._bannerLib = bannerLib;
        this._bannerSprite = bannerSprite;
        this.titleFont = 4;
        this.titleColor = [255, 255, 255, 255];
        this.callbacks = callbacks;
        this.currentPageItems = null;
        this.itemsPerPage = 10;
        this._currentPage = 1;

        if (this.callbacks != null) {
            if (this.callbacks.itemSelected != null) this.callbacks.itemSelected = this.callbacks.itemSelected.bind(this);
            if (this.callbacks.pageChanged != null) this.callbacks.pageChanged = this.callbacks.pageChanged.bind(this);
            if (this.callbacks.closed != null) this.callbacks.closed = this.callbacks.closed.bind(this);
        }

        loadTextureDictionary("commonmenu");
        loadTextureDictionary(this._bannerLib);
    }

    get visible() {
        return this._visible;
    }

    set visible(show) {
        let idx = activeMenus.indexOf(this);
        if (show) {
            if (idx != -1) return;
            if (this.currentPageItems == null) this.currentPageItems = paginate(this.items, this.itemsPerPage, this._currentPage);
            activeMenus.push(this);
        } else {
            if (idx == -1) return;
            activeMenus.splice(idx, 1);
        }

        if (activeMenus.length < 1) mp.gui.cursor.visible = false;
        if (show) mp.gui.cursor.visible = true;
        this._visible = show;

        if (!this._visible) {
            if (this.callbacks != null && this.callbacks.closed != null) this.callbacks.closed();
            mp.events.call("OnMenuClosed", this);
        }
    }

    setBanner(lib, banner) {
        loadTextureDictionary(lib);

        this._bannerLib = lib;
        this._bannerSprite = banner;
    }

    get currentPage() {
        return this._currentPage;
    }

    set currentPage(page) {
        let maxPage = this.maxPages;
        let newPage = (page < 1) ? 1 : (page > maxPage) ? maxPage : page;

        if (this._currentPage != newPage) {
            let curPage = this._currentPage;
            this._currentPage = newPage;
            this.currentPageItems = paginate(this.items, this.itemsPerPage, this._currentPage);

            if (this.callbacks != null && this.callbacks.pageChanged != null) this.callbacks.pageChanged(curPage, newPage);
            mp.events.call("OnMenuPageChanged", this, curPage, newPage);
        }
    }

    get maxPages() {
        return Math.ceil(this.items.length / this.itemsPerPage);
    }
}

class MenuItem {
    constructor(title, textColor = [255, 255, 255, 255], bgColor = [0, 0, 0, 200], selectedCallback = null) {
        this.title = title;
        this.disabled = false;
        this.textColor = textColor;
        this.bgColor = bgColor;
        this._icon = 0;
        this._iconSprite = itemIcons[0];
        this.font = 4;
        this.outline = true;
        this.shadow = false;
        this.rightText = "";
        this.selectedCallback = selectedCallback;
    }

    get icon() {
        return this._icon;
    }

    set icon(id) {
        if (id < 0 || id >= itemIcons.length) return;
        this._icon = id;
        this._iconSprite = itemIcons[id];
    }
}

// trigger item select event
mp.events.add("click", (absoluteX, absoluteY, upOrDown, leftOrRight) => {
    if (upOrDown == "down" && leftOrRight == "left") {
        for (let i = 0, max = activeMenus.length; i < max; i++) {
            let menu = activeMenus[i];
            let items = menu.currentPageItems;
            let pagedidx = menu.hoverItem;
            let menuidx = menu.items.indexOf(items[pagedidx]);
            if (pagedidx == -1 || items[pagedidx].disabled) continue;
            if (items[pagedidx].selectedCallback != null) items[pagedidx].selectedCallback();
            if (menu.callbacks != null && menu.callbacks.itemSelected != null) menu.callbacks.itemSelected(items[pagedidx], menuidx);
            mp.events.call("OnMenuItemSelected", menu, items[pagedidx], menuidx);
        }
    }
});

// render active menus
mp.events.add("render", () => {
    if (activeMenus.length < 1) return;
    let resolution = mp.game.graphics.getScreenActiveResolution(0, 0);
    let cursorPos = mp.gui.cursor.position;
    let cursorUIPos = [cursorPos[0] / resolution.x, cursorPos[1] / resolution.y];

    for (let x = 0, max = activeMenus.length; x < max; x++) {
        let menuBoundsX = [activeMenus[x].x - (itemWidth / 2), activeMenus[x].x + (itemWidth / 2)];

        // header
        mp.game.graphics.drawSprite(activeMenus[x]._bannerLib, activeMenus[x]._bannerSprite, activeMenus[x].x, activeMenus[x].y, 0.225, 0.095, 0.0, 255, 255, 255, 255);
        mp.game.graphics.drawText(activeMenus[x].title, [activeMenus[x].x, activeMenus[x].y - 0.025], {font: activeMenus[x].titleFont, color: activeMenus[x].titleColor, scale: [0.85, 0.85], outline: true});

        // description
        mp.game.graphics.drawSprite("commonmenu", "gradient_nav", activeMenus[x].x, activeMenus[x].y + 0.0683, itemWidth, itemHeight, 0.0, 0, 0, 0, 255);
        mp.game.graphics.drawText(`Page ${activeMenus[x].currentPage}/${activeMenus[x].maxPages}`, [activeMenus[x].x, activeMenus[x].y + 0.05], {font: 4, color: [255, 255, 255, 255], scale: [0.5, 0.5], outline: true});

        // items
        activeMenus[x].hoverItem = -1;
        for (let i = 0, max = activeMenus[x].currentPageItems.length; i < max; i++) {
            let itemDrawY = activeMenus[x].y + menuAndItemSpace + (i * itemSeparatorHeight);
            let itemBoundY = [itemDrawY - itemHeight / 2, itemDrawY + itemHeight / 2];
            let bgColor = activeMenus[x].currentPageItems[i].bgColor;

            if (mp.gui.cursor.visible && (cursorUIPos[0] >= menuBoundsX[0] && cursorUIPos[0] <= menuBoundsX[1] && cursorUIPos[1] >= itemBoundY[0] && cursorUIPos[1] <= itemBoundY[1])) {
                activeMenus[x].hoverItem = i;
            }

            if (activeMenus[x].hoverItem == i) bgColor = highlightColor;
            if (activeMenus[x].currentPageItems[i].disabled) bgColor = disabledColor;
            mp.game.graphics.drawSprite("commonmenu", "gradient_nav", activeMenus[x].x, itemDrawY, itemWidth, itemHeight, 0.0, bgColor[0], bgColor[1], bgColor[2], bgColor[3]);

            // draw text
            drawText(activeMenus[x].currentPageItems[i].title, [activeMenus[x].x - ((activeMenus[x].currentPageItems[i]._iconSprite != null) ? 0.095 : 0.1085), itemDrawY - 0.0175], {
                font: activeMenus[x].currentPageItems[i].font,
                color: [activeMenus[x].currentPageItems[i].textColor[0], activeMenus[x].currentPageItems[i].textColor[1], activeMenus[x].currentPageItems[i].textColor[2], ((activeMenus[x].currentPageItems[i].disabled) ? 150 : activeMenus[x].currentPageItems[i].textColor[3])],
                scale: 0.5,
                outline: activeMenus[x].currentPageItems[i].outline,
                align: 0,
                shadow: activeMenus[x].currentPageItems[i].shadow
            });

            // draw rightText (if set)
            if (activeMenus[x].currentPageItems[i].rightText.length > 0) {
                drawText(activeMenus[x].currentPageItems[i].rightText, [activeMenus[x].x + 0.1085, itemDrawY - 0.0175], {
                    font: activeMenus[x].currentPageItems[i].font,
                    color: [activeMenus[x].currentPageItems[i].textColor[0], activeMenus[x].currentPageItems[i].textColor[1], activeMenus[x].currentPageItems[i].textColor[2], ((activeMenus[x].currentPageItems[i].disabled) ? 150 : activeMenus[x].currentPageItems[i].textColor[3])],
                    scale: 0.5,
                    outline: activeMenus[x].currentPageItems[i].outline,
                    align: 2,
                    shadow: activeMenus[x].currentPageItems[i].shadow
                });
            }

            // draw icon (if set)
            if (activeMenus[x].currentPageItems[i]._iconSprite != null) mp.game.graphics.drawSprite("commonmenu", activeMenus[x].currentPageItems[i]._iconSprite, (activeMenus[x].x - 0.1023), itemDrawY, 0.025, 0.05, 0.0, 255, 255, 255, 255);
        }
    }
});

// left arrow key, will go to the previous page on all open menus
mp.keys.bind(0x25, false, () => {
    if (activeMenus.length < 1) return;
    for (let i = activeMenus.length - 1; i >= 0; i--) {
        activeMenus[i].currentPage--;
    }
});

// right arrow key, will go to the next page on all open menus
mp.keys.bind(0x27, false, () => {
    if (activeMenus.length < 1) return;
    for (let i = activeMenus.length - 1; i >= 0; i--) {
        activeMenus[i].currentPage++;
    }
});

// esc key handling, will close the last menu (if esc isn't disabled for it)
mp.keys.bind(0x1B, false, () => {
    if (activeMenus.length < 1) return;
    for (let i = activeMenus.length - 1; i >= 0; i--) {
        if (activeMenus[i].disableESC) continue;
        activeMenus[i].visible = false;
        break;
    }
});

exports = {
    BasicMenu: BasicMenu,
    MenuItem: MenuItem,
    MenuItemIcons: {
        None: 0,
        Lock: 1,
        Tick: 2
    }
};