const menuLib = require("basicmenu");
const vehicles = require("vspawner/vehicleHashes");
const categoryTitles = ["Compacts", "Sedans", "SUVs", "Coupes", "Muscle", "Sports Classics", "Sports", "Super", "Motorcycles", "Off-Road", "Industrial", "Utility", "Vans", "Cycles", "Boats", "Helicopters", "Planes", "Service", "Emergency", "Military", "Commercial", "Trains"];

// main menu
let mainMenu = new menuLib.BasicMenu("Vehicle Spawner", 0.885, 0.2595, "commonmenu", "interaction_bgd", {
    itemSelected: function(item, itemIndex) {
        this.visible = false;
        curCategory = itemIndex;
        categoryMenus[itemIndex].visible = true;
    }
});

let categoryMenus = [];
let curCategory = -1;

// categories
for (let i = 0; i < categoryTitles.length; i++) {
    mainMenu.items.push(new menuLib.MenuItem(categoryTitles[i]));

    let categoryMenu = new menuLib.BasicMenu(categoryTitles[i], 0.885, 0.2595, "commonmenu", "interaction_bgd", {
        itemSelected: function(item, itemIndex) {
            mp.events.callRemote("vspawner_Spawn", item.title);
        },

        closed: function() {
            curCategory = -1;
            mainMenu.visible = true;
        }
    });

    categoryMenus.push(categoryMenu);
}

// vehicles
for (let prop in vehicles) {
    if (vehicles.hasOwnProperty(prop)) {
        let vehicleClass = mp.game.vehicle.getVehicleClassFromName(vehicles[prop]);
        let vehicleName = mp.game.ui.getLabelText(prop);
        let vehicleItem = new menuLib.MenuItem(prop);
        vehicleItem.rightText = vehicleName == "NULL" ? "" : vehicleName;
        categoryMenus[vehicleClass].items.push(vehicleItem);
    }
}

// f4 key - toggle menu visibility
mp.keys.bind(0x73, false, () => {
    if (curCategory > -1) categoryMenus[curCategory].visible = !categoryMenus[curCategory].visible;
    mainMenu.visible = !mainMenu.visible;
});