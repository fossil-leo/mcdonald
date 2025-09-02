document.addEventListener('DOMContentLoaded', () => {

    // Configuration
    const DAY_LENGTH_SECONDS = 180;
    const DAILY_GOAL_START = 100;
    const RESTOCK_COST = 10;
    const INGREDIENT_STOCK_REFILL = 10;

    const FOOD_PRODUCTION_TIME = {
        Fries: 4000,  // 4 seconds
        Drink: 1000,  // 1 second
    };

    const FOOD_INGREDIENTS = {
        Burger: { buns: 1, patties: 1 },
        Fries: { potatoes: 1 },
        Drink: { cups: 1 },
    };

    const FOOD_PRICE = {
        Burger: 10,
        Fries: 10,
        Drink: 10,
    };

    // Main Game Class
    class Game {
        constructor() {
            this.username = localStorage.getItem('mcdonalds_tycoon_username') || 'Player';
            // DOM Elements
            this.dom = {
                playerName: document.getElementById('player-name'),
                dayCounter: document.getElementById('day-counter'),
                timer: document.getElementById('timer'),
                cash: document.getElementById('cash'),
                goal: document.getElementById('goal'),
                bunsStock: document.getElementById('buns-stock'),
                pattiesStock: document.getElementById('patties-stock'),
                potatoesStock: document.getElementById('potatoes-stock'),
                cupsStock: document.getElementById('cups-stock'),
                customerQueue: document.getElementById('customer-queue'),
                assemblyArea: document.getElementById('assembly-area'),
                trayItems: document.getElementById('tray-items'),
                serveBtn: document.getElementById('serve-btn'),
                restockBtn: document.getElementById('restock-btn'),
                stations: {
                    grill: document.getElementById('grill'),
                    fryer: document.getElementById('fryer'),
                    drinkMachine: document.getElementById('drink-machine'),
                },
                dayEndModal: {
                    modal: document.getElementById('modal'),
                    title: document.getElementById('modal-title'),
                    text: document.getElementById('modal-text'),
                    btn: document.getElementById('modal-btn'),
                },
                burgerModal: {
                    modal: document.getElementById('burger-modal'),
                    stackArea: document.getElementById('burger-stack-area'),
                    ingredientBtns: document.querySelectorAll('#ingredient-options button'),
                    finishBtn: document.getElementById('finish-burger-btn'),
                    resetBtn: document.getElementById('reset-burger-btn'),
                    cancelBtn: document.getElementById('cancel-burger-btn'),
                    recipeDisplay: document.getElementById('recipe-display'),
                },
                fryerModal: {
                    modal: document.getElementById('fryer-modal'),
                    friesDroppedCount: document.getElementById('fries-dropped-count'),
                    gameArea: document.getElementById('fryer-game-area'),
                    indicator: document.getElementById('fry-drop-indicator'),
                    dropBtn: document.getElementById('drop-fry-btn'),
                    cancelBtn: document.getElementById('cancel-fryer-btn'),
                },
                drinkModal: {
                    modal: document.getElementById('drink-modal'),
                    blenderArea: document.getElementById('blender-area'),
                    ingredientBtns: document.querySelectorAll('#drink-ingredient-options button'),
                    finishBtn: document.getElementById('finish-drink-btn'),
                    resetBtn: document.getElementById('reset-drink-btn'),
                    cancelBtn: document.getElementById('cancel-drink-btn'),
                    recipeDisplay: document.getElementById('drink-recipe-display'),
                }
            };

            // Event Listeners
            this.dom.restockBtn.onclick = () => this.restock();
            this.dom.serveBtn.onclick = () => this.serveOrder();
            this.dom.stations.grill.onclick = () => this.startBurgerMiniGame();
            this.dom.stations.fryer.onclick = () => this.startFryerMiniGame();
            this.dom.stations.drinkMachine.onclick = () => this.startDrinkMiniGame();
            this.dom.dayEndModal.btn.onclick = () => this.startNewDay();

            // Burger mini-game listeners
            this.dom.burgerModal.ingredientBtns.forEach(btn => {
                btn.onclick = () => this.addBurgerIngredient(btn.dataset.ingredient);
            });
            this.dom.burgerModal.finishBtn.onclick = () => this.finishBurger();
            this.dom.burgerModal.resetBtn.onclick = () => this.resetBurgerStack();
            this.dom.burgerModal.cancelBtn.onclick = () => this.cancelBurgerMiniGame();

            // Fryer mini-game listeners
            this.dom.fryerModal.dropBtn.onclick = () => this.dropFry();
            this.dom.fryerModal.cancelBtn.onclick = () => this.cancelFryerMiniGame();

            // Drink mini-game listeners
            this.dom.drinkModal.ingredientBtns.forEach(btn => {
                btn.onclick = () => this.addDrinkIngredient(btn.dataset.ingredient);
            });
            this.dom.drinkModal.finishBtn.onclick = () => this.finishDrink();
            this.dom.drinkModal.resetBtn.onclick = () => this.resetDrinkStack();
            this.dom.drinkModal.cancelBtn.onclick = () => this.cancelDrinkMiniGame();

            this.burgerMiddleIngredients = ['Patty', 'Cheese', 'Lettuce', 'Tomato'];
            this.currentBurgerStack = [];
            this.currentBurgerRecipe = [];
            this.friesDropped = 0;
            this.friesNeeded = 5;
            this.drinkIngredients = ['Ice', 'Syrup', 'Orange'];
            this.currentDrinkStack = [];
            this.currentDrinkRecipe = [];
            this.gamePaused = false;

            this.startNewGame();
        }

        startNewGame() {
            this.day = 1;
            this.cash = 0;
            this.startNewDay();
        }

        startNewDay() {
            this.cash = 0;
            this.goal = DAILY_GOAL_START + (this.day - 1) * 25;
            this.timeLeft = DAY_LENGTH_SECONDS;
            this.customers = [];
            this.selectedCustomer = null;
            this.tray = [];
            this.inventory = { buns: 10, patties: 10, potatoes: 10, cups: 10 };

            this.dom.customerQueue.innerHTML = '';
            this.dom.assemblyArea.innerHTML = '';
            this.dom.trayItems.innerHTML = '';
            this.dom.dayEndModal.modal.classList.add('hidden');
            this.dom.burgerModal.modal.classList.add('hidden');
            this.dom.drinkModal.modal.classList.add('hidden');

            this.updateUI();

            this.gameInterval = setInterval(() => this.tick(), 1000);
            this.customerInterval = setInterval(() => this.addCustomer(), 5000);
        }

        tick() {
            if (this.gamePaused) return;
            this.timeLeft--;
            this.updateUI();
            if (this.timeLeft <= 0) {
                this.endDay();
            }
        }

        endDay() {
            clearInterval(this.gameInterval);
            clearInterval(this.customerInterval);

            if (this.cash >= this.goal) {
                this.dom.dayEndModal.title.textContent = `Day ${this.day} Complete!`;
                this.dom.dayEndModal.text.textContent = `You earned ${this.cash}, beating the goal of ${this.goal}!`;
                this.dom.dayEndModal.btn.textContent = 'Start Next Day';
                this.day++;
            } else {
                this.dom.dayEndModal.title.textContent = `Game Over`;
                this.dom.dayEndModal.text.textContent = `You only earned ${this.cash}, failing to meet the goal of ${this.goal}.`;
                this.dom.dayEndModal.btn.textContent = 'Try Again';
                this.day = 1; // Reset for new game
                this.cash = 0;
            }
            this.dom.dayEndModal.modal.classList.remove('hidden');
        }

        updateUI() {
            this.dom.playerName.textContent = this.username;
            this.dom.dayCounter.textContent = this.day;
            this.dom.timer.textContent = this.timeLeft;
            this.dom.cash.textContent = this.cash;
            this.dom.goal.textContent = this.goal;
            for (const item in this.inventory) {
                this.dom[`${item}Stock`].textContent = this.inventory[item];
            }
            this.dom.serveBtn.disabled = !this.canServe();
            this.dom.fryerModal.friesDroppedCount.textContent = this.friesDropped;
        }

        addCustomer() {
            if (this.gamePaused) return;
            if (this.customers.length >= 3) return;
            const newCustomer = new Customer();
            this.customers.push(newCustomer);
            const customerDiv = newCustomer.render();
            customerDiv.onclick = () => this.selectCustomer(newCustomer);
            this.dom.customerQueue.appendChild(customerDiv);
        }

        selectCustomer(customer) {
            if (this.selectedCustomer) {
                this.selectedCustomer.div.classList.remove('selected');
            }
            this.selectedCustomer = customer;
            this.selectedCustomer.div.classList.add('selected');
            this.updateUI();
        }

        produce(foodName) {
            // This function is now a dispatcher for mini-games
            if (foodName === 'Burger') {
                this.startBurgerMiniGame();
            } else if (foodName === 'Fries') {
                this.startFryerMiniGame();
            } else if (foodName === 'Drink') {
                this.startDrinkMiniGame();
            }
        }

        addToAssembly(foodName) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'food-item';
            itemDiv.textContent = foodName;
            itemDiv.onclick = () => this.moveToTray(foodName, itemDiv);
            this.dom.assemblyArea.appendChild(itemDiv);
        }

        moveToTray(foodName, element) {
            this.tray.push(foodName);
            this.dom.trayItems.appendChild(element);
            element.onclick = null; // Prevent moving back

            element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                // Remove from tray array
                const index = this.tray.indexOf(foodName);
                if (index > -1) {
                    this.tray.splice(index, 1);
                }
                // Remove from DOM
                element.remove();
                // Update UI
                this.updateUI();
            });

            this.updateUI();
        }

        canServe() {
            if (!this.selectedCustomer) return false;
            const order = this.selectedCustomer.order.slice().sort();
            const tray = this.tray.slice().sort();
            return JSON.stringify(order) === JSON.stringify(tray);
        }

        serveOrder() {
            if (!this.canServe()) return;

            // Add cash
            this.tray.forEach(item => this.cash += FOOD_PRICE[item]);

            // Clear tray and remove customer
            this.dom.trayItems.innerHTML = '';
            this.tray = [];
            this.dom.customerQueue.removeChild(this.selectedCustomer.div);
            this.customers = this.customers.filter(c => c !== this.selectedCustomer);
            this.selectedCustomer = null;

            this.updateUI();
        }

        restock() {
            if (this.cash >= RESTOCK_COST) {
                this.cash -= RESTOCK_COST;
                for (const item in this.inventory) {
                    this.inventory[item] += INGREDIENT_STOCK_REFILL;
                }
                this.updateUI();
            } else {
                alert('Not enough cash to restock!');
            }
        }

        // Burger Mini-Game Methods
        startBurgerMiniGame() {
            const ingredients = FOOD_INGREDIENTS.Burger;
            for (const item in ingredients) {
                if (this.inventory[item] < ingredients[item]) {
                    alert(`Not enough ${item} for a burger!`);
                    return;
                }
            }
            
            // Pause game
            this.gamePaused = true;

            // Generate random recipe
            this.currentBurgerRecipe = ['Bottom Bun'];
            const numMiddleIngredients = Math.floor(Math.random() * 3) + 1; // 1 to 3 middle ingredients
            const shuffledMiddleIngredients = this.burgerMiddleIngredients.sort(() => 0.5 - Math.random());
            for (let i = 0; i < numMiddleIngredients; i++) {
                this.currentBurgerRecipe.push(shuffledMiddleIngredients[i]);
            }
            this.currentBurgerRecipe.push('Top Bun');

            this.dom.burgerModal.recipeDisplay.textContent = `Recipe: ${this.currentBurgerRecipe.join(', ')}`;

            this.resetBurgerStack();
            this.dom.burgerModal.modal.classList.remove('hidden');
        }

        addBurgerIngredient(ingredient) {
            this.currentBurgerStack.push(ingredient);
            const ingredientDiv = document.createElement('div');
            ingredientDiv.className = `burger-ingredient ${ingredient.toLowerCase().replace(/ /g, '-')}`;
            this.dom.burgerModal.stackArea.appendChild(ingredientDiv);
        }

        resetBurgerStack() {
            this.currentBurgerStack = [];
            this.dom.burgerModal.stackArea.innerHTML = '';
        }

        cancelBurgerMiniGame() {
            this.dom.burgerModal.modal.classList.add('hidden');
            this.resetBurgerStack();
            this.gamePaused = false; // Unpause game
        }

        finishBurger() {
            if (JSON.stringify(this.currentBurgerStack) === JSON.stringify(this.currentBurgerRecipe)) {
                // Success
                const ingredients = FOOD_INGREDIENTS.Burger;
                for (const item in ingredients) {
                    this.inventory[item] -= ingredients[item];
                }
                
                const burgerDiv = document.createElement('div');
                burgerDiv.className = 'food-item';
                burgerDiv.textContent = 'Burger';
                this.moveToTray('Burger', burgerDiv);

                this.cancelBurgerMiniGame(); // Close modal and reset, unpauses game
            } else {
                // Failure
                alert('Incorrect burger recipe! Try again.');
                this.resetBurgerStack();
            }
        }

        // Fryer Mini-Game Methods
        startFryerMiniGame() {
            const ingredients = FOOD_INGREDIENTS.Fries;
            for (const item in ingredients) {
                if (this.inventory[item] < ingredients[item]) {
                    alert(`Not enough ${item} for fries!`);
                    return;
                }
            }

            this.gamePaused = true; // Pause game
            this.friesDropped = 0;
            this.dom.fryerModal.friesDroppedCount.textContent = this.friesDropped;
            this.dom.fryerModal.modal.classList.remove('hidden');

            // Start indicator animation (CSS handles this, but we need to reset it)
            this.dom.fryerModal.indicator.style.animation = 'none';
            this.dom.fryerModal.indicator.offsetHeight; // Trigger reflow
            this.dom.fryerModal.indicator.style.animation = null; 
        }

        dropFry() {
            const indicatorRect = this.dom.fryerModal.indicator.getBoundingClientRect();
            const basketRect = this.dom.fryerModal.gameArea.querySelector('#fryer-basket').getBoundingClientRect();

            // Define a hit zone (e.g., middle 80% of the basket width for easier play)
            const hitZoneStart = basketRect.left + basketRect.width * 0.10;
            const hitZoneEnd = basketRect.left + basketRect.width * 0.90;

            const indicatorCenter = indicatorRect.left + indicatorRect.width / 2;

            if (indicatorCenter >= hitZoneStart && indicatorCenter <= hitZoneEnd) {
                this.friesDropped++;
                this.dom.fryerModal.friesDroppedCount.textContent = this.friesDropped;

                // Add visual fry to basket
                const fryDiv = document.createElement('div');
                fryDiv.className = 'dropped-fry';
                this.dom.fryerModal.gameArea.querySelector('#fryer-basket').appendChild(fryDiv);

                if (this.friesDropped === this.friesNeeded) {
                    // Success
                    const ingredients = FOOD_INGREDIENTS.Fries;
                    for (const item in ingredients) {
                        this.inventory[item] -= ingredients[item];
                    }
                    const friesDiv = document.createElement('div');
                    friesDiv.className = 'food-item';
                    friesDiv.textContent = 'Fries';
                    this.moveToTray('Fries', friesDiv);
                    this.cancelFryerMiniGame(); // Close modal and reset, unpauses game
                }
            } else {
                alert('Missed! You need to restart the fry mini-game.');
                this.cancelFryerMiniGame(); // Close modal and unpause game
            }
        }

        cancelFryerMiniGame() {
            this.dom.fryerModal.modal.classList.add('hidden');
            this.friesDropped = 0;
            this.gamePaused = false; // Unpause game
            this.dom.fryerModal.gameArea.querySelector('#fryer-basket').innerHTML = ''; // Clear the basket
        }

        // Drink Mini-Game Methods
        startDrinkMiniGame() {
            const ingredients = FOOD_INGREDIENTS.Drink;
            if (this.inventory.cups < ingredients.cups) {
                alert('Not enough cups for a drink!');
                return;
            }

            this.gamePaused = true;

            this.currentDrinkRecipe = ['Cup'];
            const numMiddleIngredients = Math.floor(Math.random() * 2) + 1; // 1 or 2 middle ingredients
            const shuffledMiddleIngredients = this.drinkIngredients.sort(() => 0.5 - Math.random());
            for (let i = 0; i < numMiddleIngredients; i++) {
                this.currentDrinkRecipe.push(shuffledMiddleIngredients[i]);
            }

            this.dom.drinkModal.recipeDisplay.textContent = `Recipe: ${this.currentDrinkRecipe.join(', ')}`;
            this.resetDrinkStack();
            this.dom.drinkModal.modal.classList.remove('hidden');
        }

        addDrinkIngredient(ingredient) {
            this.currentDrinkStack.push(ingredient);
            const ingredientDiv = document.createElement('div');
            ingredientDiv.className = `drink-ingredient ${ingredient.toLowerCase().replace(/ /g, '-')}`;
            this.dom.drinkModal.blenderArea.appendChild(ingredientDiv);
        }

        resetDrinkStack() {
            this.currentDrinkStack = [];
            this.dom.drinkModal.blenderArea.innerHTML = '';
        }

        cancelDrinkMiniGame() {
            this.dom.drinkModal.modal.classList.add('hidden');
            this.resetDrinkStack();
            this.gamePaused = false;
        }

        finishDrink() {
            if (JSON.stringify(this.currentDrinkStack.sort()) === JSON.stringify(this.currentDrinkRecipe.sort())) {
                const ingredients = FOOD_INGREDIENTS.Drink;
                this.inventory.cups -= ingredients.cups;
                this.addToAssembly('Drink');
                this.cancelDrinkMiniGame();
            } else {
                alert('Incorrect drink recipe! Try again.');
                this.resetDrinkStack();
            }
        }
    }

    // Customer Class
    class Customer {
        constructor() {
            this.order = this.createRandomOrder();
            this.div = null;
        }

        createRandomOrder() {
            const order = [];
            const itemCount = Math.ceil(Math.random() * 2); // 1 or 2 items
            const menu = Object.keys(FOOD_PRICE);
            for (let i = 0; i < itemCount; i++) {
                order.push(menu[Math.floor(Math.random() * menu.length)]);
            }
            return order;
        }

        render() {
            this.div = document.createElement('div');
            this.div.className = 'customer';
            this.div.innerHTML = `Order: ${this.order.join(', ')}`;
            return this.div;
        }
    }

    

    // Get references to the tutorial, consent, and game elements
    const tutorialScreen = document.getElementById('tutorial-screen');
    const consentForm = document.getElementById('consent-form');
    const gameContent = document.getElementById('game-content');
    const startGameBtn = document.getElementById('start-game-btn');
    const agreeBtn = document.getElementById('agree-btn');
    const disagreeBtn = document.getElementById('disagree-btn');

    // Add event listener to the start game button (from tutorial)
    startGameBtn.addEventListener('click', () => {
        tutorialScreen.style.display = 'none'; // Hide tutorial
        consentForm.style.display = 'block'; // Show consent form
    });

    // Add event listener for the agree button
    agreeBtn.addEventListener('click', () => {
        consentForm.style.display = 'none'; // Hide consent form
        gameContent.style.display = 'block'; // Show game content
        new Game(); // Start the game
    });

    // Add event listener for the disagree button
    disagreeBtn.addEventListener('click', () => {
        consentForm.style.display = 'none'; // Hide consent form
        tutorialScreen.style.display = 'block'; // Show tutorial again
        alert('게임 이용에 동의하지 않으시면 게임을 시작할 수 없습니다.'); // Inform user
    });

    // Get references to the login elements
    const loginScreen = document.getElementById('login-screen');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const loginMessage = document.getElementById('login-message');

    // Initial display setup
    loginScreen.style.display = 'block'; // Show login screen
    tutorialScreen.style.display = 'none'; // Hide tutorial screen
    consentForm.style.display = 'none'; // Hide consent form
    gameContent.style.display = 'none'; // Hide game content

    // Add event listener for the login button
    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (username && password) {
            localStorage.setItem('mcdonalds_tycoon_username', username);
            localStorage.setItem('mcdonalds_tycoon_password', password);
            loginScreen.style.display = 'none'; // Hide login screen
            tutorialScreen.style.display = 'block'; // Show tutorial screen
            loginMessage.textContent = ''; // Clear any previous messages
            alert('아이디와 비밀번호가 저장되었습니다.');
        } else {
            loginMessage.textContent = '아이디와 비밀번호를 모두 입력해주세요.'; // Display error message
        }
    });

    
});