declare var process: { env: { NODE_ENV: string } };
import * as React from "react";
import { ModalDialog, ModalContainer } from 'react-modal-dialog';
import { Options, OptionsComponent } from './Options';
import { AscensionComponent, Upgrades } from './Ascension';
import { TranscendComponent } from './Transcend';
import { MiniButton } from './MiniButton'
import { LetterOptions, LetterOptionsComponent } from './LetterOptions';
import { MainGame, LetterRecord, maxLettersCount } from "./MainGame";
import { AchievementData, AchievementsComponent, achievementDefs, getAchievementBonus } from './Achievements';
import { GameStats, StatisticsComponent } from './Statistics';
import { ChallengeState, ChallengesComponent, challengeDefs, challengeById, getChallengeBonus } from './Challenges';
import { PrestigeComponent } from './Prestige';

function achievementById(id: string): { name: string } {
    for (var i = 0; i < achievementDefs.length; i++) {
        if (achievementDefs[i].id === id) return achievementDefs[i];
    }
    return { name: id };
}

export class AltShiftState {
    shiftDown = false;
    altDown = false;
}

// Vowel letter indices: A=1, E=5, I=9, O=15, U=21
const vowelIndices = [1, 5, 9, 15, 21];

interface GameRootState {
    letters: Array<LetterRecord>;
    letterOptions: Array<LetterOptions>;
    optionsOpened: boolean;
    letterOptionsOpened: boolean;
    letterOptionsIdx: number;
    ascension: boolean;
    options: Options;
    upgrades: Upgrades;
    stage: number;
    altShiftState: AltShiftState;
    // New feature state
    achievements: AchievementData;
    stats: GameStats;
    challenges: ChallengeState;
    glyphs: number;
    prestigeLevel: number;
    lastSaveTime: number;
    // Standalone modals
    showAchievements: boolean;
    showChallenges: boolean;
    showPrestige: boolean;
    // Notification
    notification: string;
    notificationKey: number;
    // Debug
    debugAutoPlay: boolean;
}

function getKeys<T>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}

const suffixRanges: { [idx: string]: number[] } = {
    AE: [1, 5],
    FJ: [6, 10],
    KO: [11, 15],
    PT: [16, 20],
    UZ: [21, 26]
};

const upgradeSuffixes = [
    'AE', 'FJ', 'KO', 'PT', 'UZ'
];

function upgradeSuffixToRange(upgradeName: string) {
    const suffix = upgradeName.substr(upgradeName.length - 2);
    let rv = suffixRanges[suffix];
    return rv || [0, 0];
}

function indexToUpgradeSuffix(idx: number) {
    return upgradeSuffixes[Math.floor((idx - 1) / 5)];
}

function createArray<T>(size: number, className: { new (): T }): Array<T> {
    let rv = new Array<T>(size);
    for (let i = 0; i < size; ++i) {
        rv[i] = new className();
    }
    return rv;
}

const lettersSeq = '\u221EABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class GameRoot extends React.Component<undefined, GameRootState> {

    timerId: number;
    debugTimerId: number;
    lastUpdate: number;
    lastSave: number;


    multipliers = new Array<number>(maxLettersCount);

    notificationTimer: any = null;

    constructor() {
        super();
        this.state = {
            letters: [new LetterRecord()],
            letterOptions: createArray(maxLettersCount, LetterOptions),
            letterOptionsOpened: false,
            letterOptionsIdx: 0,
            optionsOpened: false,
            ascension: false,
            options: new Options(),
            upgrades: new Upgrades(),
            altShiftState: new AltShiftState(),
            stage: 1,
            // New features
            achievements: {},
            stats: new GameStats(),
            challenges: { completed: {}, active: null as string },
            glyphs: 0,
            prestigeLevel: 0,
            lastSaveTime: Date.now(),
            showAchievements: false,
            showChallenges: false,
            showPrestige: false,
            notification: '',
            notificationKey: 0,
            debugAutoPlay: false
        };
        this.timerId = setInterval(() => this.onTimer(), 1000);
        this.lastUpdate = performance.now();
        this.lastSave = this.lastUpdate;
        this.load();
        window.onunload = () => this.save();
        window.document.addEventListener("keydown", (e) => this.onKeyEvent(e));
        window.document.addEventListener("keyup", (e) => this.onKeyEvent(e));
        window.addEventListener("blur", () => this.onBlurOrFocus());
        window.addEventListener("focus", () => this.onBlurOrFocus());
    }

    // --- Notification ---
    showNotification(msg: string) {
        this.setState((s) => ({ notification: msg, notificationKey: s.notificationKey + 1 }));
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
        this.notificationTimer = setTimeout(() => {
            this.setState({ notification: '' });
            this.notificationTimer = null;
        }, 3000);
    }

    // --- Save/Load ---
    save() {
        if (localStorage) {
            let stateToSave = { ...this.state, lastSaveTime: Date.now() };
            let saveData = JSON.stringify(stateToSave);
            localStorage.setItem("azincsave", saveData);
        }
    }

    // Feature #12: Import/Export
    onExportSave(): string {
        this.save();
        let data = localStorage.getItem("azincsave") || '';
        return btoa(data);
    }

    onImportSave(data: string) {
        let decoded = atob(data);
        let parsed = JSON.parse(decoded);
        if (parsed && parsed.letters) {
            localStorage.setItem("azincsave", decoded);
            this.load();
            this.forceUpdate();
        } else {
            throw new Error('Invalid save data');
        }
    }

    // Feature #13: Hotkeys for letters A-Z
    onKeyEvent(e: KeyboardEvent) {
        let newAltShiftState = new AltShiftState();
        newAltShiftState.altDown = e.altKey;
        newAltShiftState.shiftDown = e.shiftKey;
        this.onChangeAltShiftState(newAltShiftState);

        if (e.key == "Alt") {
            e.preventDefault();
        }

        // Hotkeys: A-Z keys trigger letter click
        if (e.type === 'keydown' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            let key = e.key.toUpperCase();
            let idx = lettersSeq.indexOf(key);
            if (idx > 0 && idx < this.state.letters.length) {
                this.onLetterClick(idx);
            }
        }
    }

    onBlurOrFocus() {
        this.onChangeAltShiftState(new AltShiftState());
    }

    // --- Debug Auto-Play ---
    toggleDebugAutoPlay() {
        if (this.state.debugAutoPlay) {
            clearInterval(this.debugTimerId);
            this.setState({ debugAutoPlay: false });
        } else {
            this.debugTimerId = setInterval(() => this.debugAutoPlayTick(), 500) as any;
            this.setState({ debugAutoPlay: true });
        }
    }

    debugAutoPlayTick() {
        // Stop at ascension/transcend screens — let the player decide
        if (this.state.ascension) return;

        let showTranscendScreen = this.state.stage > 1 &&
            this.state.letters.length >= maxLettersCount &&
            this.state.letters[this.state.letters.length - 1].count >= 10;
        if (showTranscendScreen) return;

        // Normal gameplay: pump counts and unlock one letter per tick
        let letters = this.state.letters.slice();

        // Bootstrap: if only infinity exists, create letter A
        if (letters.length <= 1) {
            letters.push(new LetterRecord());
        }

        // Give all existing letters huge counts and levels
        for (let i = 1; i < letters.length; i++) {
            letters[i].count += 1e6;
            letters[i].level += 100;
        }

        // Unlock one new letter per tick so progress is visible
        if (letters.length < maxLettersCount) {
            letters.push(new LetterRecord());
            let i = letters.length - 1;
            letters[i].count = 1e6;
            letters[i].level = 100;
        }

        this.updateChange(letters);
        this.setState({ letters });
    }

    updateMultipliers(u: Upgrades) {
        for (let i = 0; i < this.multipliers.length; ++i)this.multipliers[i] = 1;
        for (let k of getKeys(u)) {
            if (u[k] && k.substr(0, 4) == "mult") {
                let r = upgradeSuffixToRange(k);
                if (r) {
                    for (let i = r[0]; i <= r[1]; ++i) {
                        this.multipliers[i] = u.globalMult ? 4 : 2;
                    }
                }
            }
        }
    }

    // Feature #4: Synergy check
    getSynergyMultiplier(): number {
        let letters = this.state.letters;
        let allVowelsActive = vowelIndices.every(idx =>
            idx < letters.length && letters[idx].count > 0 && !letters[idx].paused
        );
        return allVowelsActive ? 1.5 : 1.0;
    }

    // Feature #15: Score calculation
    calculateScore(): number {
        let letters = this.state.letters;
        let totalGen = 0;
        for (let i = 1; i < letters.length; i++) {
            totalGen += letters[i].generating;
        }
        let letterCount = letters.length - 1;
        let prestigeBonus = 1 + (this.state.glyphs * 0.05);
        return Math.floor(totalGen * letterCount * prestigeBonus);
    }

    // Feature #2: Achievement checking
    checkAchievements(newState?: Partial<GameRootState>) {
        try {
        let s = { ...this.state, ...newState } as GameRootState;
        if (!s.achievements || !s.stats || !s.challenges) return;
        let achievements = { ...s.achievements };
        let changed = false;

        let check = (id: string, condition: boolean) => {
            if (!achievements[id] && condition) {
                achievements[id] = true;
                changed = true;
                this.showNotification('Achievement: ' + achievementById(id).name);
            }
        };

        check('first_click', s.stats.totalClicks > 0);
        check('unlock_e', s.letters.length > 5);
        check('unlock_m', s.letters.length > 13);
        check('unlock_z', s.letters.length >= maxLettersCount);
        check('count_1m_a', s.letters.length > 1 && s.letters[1].count >= 1000000);
        check('level_100', s.letters.some(l => l.level >= 100));
        check('all_generating', s.letters.length > 2 && s.letters.slice(1).every(l => l.generating > 0));
        check('click_100', s.stats.totalClicks >= 100);
        check('click_1000', s.stats.totalClicks >= 1000);
        check('prestige_1', s.prestigeLevel >= 1);
        check('synergy_active', this.getSynergyMultiplier() > 1);
        check('challenge_1', Object.keys(s.challenges.completed).some(k => s.challenges.completed[k]));

        let runTime = (Date.now() - s.stats.currentRunStart) / 1000;
        check('speed_5min', s.letters.length >= maxLettersCount && runTime <= 300);

        let allUpgrades = getKeys(s.upgrades).every(k => s.upgrades[k]);
        check('all_upgrades', allUpgrades);
        check('prestige_10', s.prestigeLevel >= 10);

        if (changed) {
            this.setState({ achievements });
        }
        } catch (e) { /* safety: don't crash game over achievements */ }
    }

    // Feature #5: Challenge checking
    checkChallengeCompletion(letters: LetterRecord[]) {
        let active = this.state.challenges.active;
        if (!active) return;

        let def = challengeById(active);
        if (!def) return;

        let completed = false;

        if (active === 'half_alphabet') {
            // Reach letter M (index 13) in under 2 minutes
            let elapsed = (Date.now() - this.state.stats.currentRunStart) / 1000;
            completed = letters.length > 13 && elapsed <= 120;
        } else {
            // All other challenges require reaching Z
            completed = letters.length >= maxLettersCount && letters[letters.length - 1].count >= 10;
        }

        if (completed) {
            let newChallenges = { ...this.state.challenges };
            newChallenges.completed = { ...newChallenges.completed, [active]: true };
            newChallenges.active = null;
            this.setState({ challenges: newChallenges });
            this.showNotification('Challenge Complete: ' + def.name + '!');
        }
    }

    // Feature #5: Challenge enforcement
    isChallengeBlocking(action: string, idx?: number): boolean {
        let active = this.state.challenges.active;
        if (!active) return false;

        if (active === 'no_pause' && action === 'pause') return true;
        if (active === 'minimalist' && action === 'upgrade' && idx !== undefined) {
            let letter = this.state.letters[idx];
            if (letter && letter.level >= 10) return true;
        }
        return false;
    }

    load() {
        try {
        let savedData = localStorage && localStorage.getItem("azincsave");
        if (savedData) {
            let parsedData = JSON.parse(savedData);
            if (parsedData) {
                if (!parsedData.altShiftState) {
                    parsedData.altShiftState = new AltShiftState();
                }
                if (!parsedData.letterOptions) {
                    parsedData.letterOptions = createArray(maxLettersCount, LetterOptions);
                }
                // Migration: add new fields if missing
                if (!parsedData.achievements) parsedData.achievements = {};
                if (!parsedData.stats) parsedData.stats = new GameStats();
                if (!parsedData.challenges) parsedData.challenges = { completed: {}, active: null as string };
                if (parsedData.glyphs === undefined) parsedData.glyphs = 0;
                if (parsedData.prestigeLevel === undefined) parsedData.prestigeLevel = 0;
                if (!parsedData.lastSaveTime) parsedData.lastSaveTime = Date.now();
                // Always close modals on load
                parsedData.optionsOpened = false;
                parsedData.showAchievements = false;
                parsedData.showChallenges = false;
                parsedData.showPrestige = false;
                parsedData.notification = '';
                parsedData.debugAutoPlay = false;

                // Feature #6: Offline progress
                let lastSave = parsedData.lastSaveTime || Date.now();
                let offlineSeconds = Math.floor((Date.now() - lastSave) / 1000);
                if (offlineSeconds > 10 && parsedData.letters && parsedData.letters.length > 1) {
                    // Simulate ticks while away (cap at 3600 to avoid freezing)
                    let simTicks = Math.min(offlineSeconds, 3600);
                    this.state = parsedData;
                    this.updateLetterOptions(this.state.letterOptions, this.state.upgrades);
                    this.updateMultipliers(this.state.upgrades);

                    let letters = this.state.letters.slice();
                    let totalGenerated = 0;
                    for (let tick = 0; tick < simTicks; tick++) {
                        this.updateChange(letters);
                        for (let i = 1; i < letters.length; i++) {
                            let l = letters[i];
                            let lp = letters[i - 1];
                            if (l.paused) continue;
                            if (i == 1 || lp.count >= 10) {
                                let [cnt, mul] = this.calcInc(letters, i, true, false);
                                if (cnt === 0) continue;
                                l.count += (cnt * mul);
                                lp.count -= cnt * 10;
                                l.count = Math.round(l.count);
                                totalGenerated += cnt * mul;
                            }
                        }
                    }
                    parsedData.letters = letters;
                    if (parsedData.stats) {
                        parsedData.stats.totalLettersGenerated = (parsedData.stats.totalLettersGenerated || 0) + totalGenerated;
                        parsedData.stats.timePlayed = (parsedData.stats.timePlayed || 0) + offlineSeconds;
                    }
                    // Show offline progress message
                    let hours = Math.floor(offlineSeconds / 3600);
                    let mins = Math.floor((offlineSeconds % 3600) / 60);
                    let timeStr = hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
                    setTimeout(() => this.showNotification('Welcome back! Earned ' + totalGenerated + ' letters in ' + timeStr), 500);
                }

                this.state = parsedData;
            }
        }
        for (let lo of this.state.letterOptions) {
            if (lo.minimumGrowth === undefined) {
                lo.minimumGrowth = 10;
            }
            if (lo.autoUpgradePriority === undefined) {
                lo.autoUpgradePriority = 5;
            }
            if (lo.autoUpgradeCondition === undefined) {
                lo.autoUpgradeCondition = 0;
            }
        }
        this.updateLetterOptions(this.state.letterOptions, this.state.upgrades);
        this.updateMultipliers(this.state.upgrades);
        this.updateChange(this.state.letters);
        } catch (e) {
            console.error('Load error, resetting save:', e);
            if (localStorage) localStorage.removeItem("azincsave");
        }
    }

    updateLetterOptions(letterOptions: Array<LetterOptions>, upgrades: Upgrades) {
        for (let i = 0; i < upgradeSuffixes.length; ++i) {
            let range = suffixRanges[upgradeSuffixes[i]];
            let upgradeName = ('autoUpgrade' + upgradeSuffixes[i]) as keyof Upgrades;
            if (upgrades[upgradeName]) {
                for (let j = range[0]; j <= range[1]; ++j) {
                    letterOptions[j].haveAutoUpgrade = true;
                }
            }
        }
    }

    // Get total bonus multiplier from all systems
    getTotalBonus(): number {
        try {
            let achievementMult = this.state.achievements ? getAchievementBonus(this.state.achievements) : 1;
            let challengeMult = this.state.challenges ? getChallengeBonus(this.state.challenges) : 1;
            let prestigeMult = 1 + ((this.state.glyphs || 0) * 0.05);
            let synergyMult = this.getSynergyMultiplier();
            let transcendMult = Math.pow(2, Math.max(0, (this.state.stage || 1) - 1));
            return achievementMult * challengeMult * prestigeMult * synergyMult * transcendMult;
        } catch (e) {
            return 1;
        }
    }

    calcInc(letters: Array<LetterRecord>, idx: number, checkOverflow: boolean, ignorePause: boolean): Array<number> {
        let l = letters[idx];
        if (!l || (l.paused && !ignorePause)) return [0, 0];
        let lp = letters[idx - 1];
        let cnt = Math.abs((lp.count / 10));
        if (!checkOverflow || idx == 1 || cnt > l.level) cnt = l.level;
        let mul = letters.length - idx - 2;
        if (mul > 15) {
            mul = 10 + Math.floor((mul - 15) / 4);
        } else if (mul > 5) {
            mul = 5 + Math.floor((mul - 5) / 2);
        }
        if (mul < 1) {
            mul = 1;
        }
        mul *= this.multipliers[idx];
        return [cnt, mul];
    }

    updateChange(newLetters: Array<LetterRecord>, altShiftState?: AltShiftState) {
        if (!altShiftState) {
            altShiftState = this.state.altShiftState;
        }
        for (let i = 1; i < newLetters.length; ++i) {
            let [cnt, mult] = this.calcInc(newLetters, i, false, false);
            let [cnt2] = this.calcInc(newLetters, i + 1, false, false);
            let [cnt2base] = this.calcInc(newLetters, i + 1, false, true);

            let prvLet = newLetters[i - 1];
            let curLet = newLetters[i];
            let nxtLet = newLetters[i + 1];

            curLet.mult = mult;
            curLet.generating = cnt * mult;
            curLet.spending = cnt2 * 10;
            curLet.change = curLet.generating - curLet.spending;
            curLet.baseChange = cnt * mult - cnt2base * 10;

            const upgradeSiffix = indexToUpgradeSuffix(i);
            const convUpgradeName = ('convPurchase' + upgradeSiffix) as keyof Upgrades;

            let lo = this.state.letterOptions[i];
            let mul = altShiftState.shiftDown ? 10 : altShiftState.altDown ? 100 : lo.defaultPurchaseAmount;
            curLet.canUpgrade = nxtLet && mul * (curLet.level + 1) <= nxtLet.count;
            let canConvUpgrade = this.state.upgrades[convUpgradeName] && (curLet.level + 1) * 10 <= curLet.count;
            if (canConvUpgrade) {
                curLet.canUpgrade = true;
            }

            // Feature #5: Challenge restriction for minimalist
            if (this.state.challenges && this.state.challenges.active === 'minimalist' && curLet.level >= 10) {
                curLet.canUpgrade = false;
            }

            let max = altShiftState.shiftDown ? 109 : altShiftState.altDown ? 1009 : (lo.defaultPurchaseToMaxLimit + 9);
            curLet.canUpgradeMax = ((nxtLet && curLet.level + 1 <= nxtLet.count) || canConvUpgrade) &&
                ((prvLet && (prvLet.change > max || prvLet.change < 0)) || i == 1);

            if (this.state.challenges && this.state.challenges.active === 'minimalist' && curLet.level >= 10) {
                curLet.canUpgradeMax = false;
            }
        }
    }

    checkForLastAutoClick(letters: LetterRecord[]) {
        if (!this.state.upgrades.autoGetLast) {
            return;
        }
        let l = letters;
        let ll = l.length;
        if (l[ll - 1].paused) {
            return;
        }
        if (ll <= 2 || l[ll - 2].count >= 10) {
            this.onLetterClick(ll - 1, letters);
        }
    }

    onTimer() {
        try {
        let now = performance.now();
        let newLetters = this.state.letters.slice();
        let updated = false;
        let totalGenerated = 0;
        while (now - this.lastUpdate > 950) {
            this.updateChange(newLetters);

            // Feature #6: Priority queue for auto-upgrades
            // Build sorted list of letters by priority
            let autoUpgradeOrder: number[] = [];
            for (let i = 1; i < newLetters.length; i++) {
                const upgradeSuffix = indexToUpgradeSuffix(i);
                const autoUpgradeName = ("autoUpgrade" + upgradeSuffix) as keyof Upgrades;
                if (this.state.upgrades[autoUpgradeName] && this.state.letterOptions[i].enableAutoUpgrade) {
                    // Feature #8: Conditional automation - check condition
                    let lo = this.state.letterOptions[i];
                    let condition = lo.autoUpgradeCondition || 0;
                    if (condition > 0 && i > 1) {
                        let prevLetter = newLetters[i - 1];
                        if (prevLetter.generating < condition) continue;
                    }
                    // Challenge restriction: no_auto
                    if (this.state.challenges && this.state.challenges.active === 'no_auto') continue;
                    autoUpgradeOrder.push(i);
                }
            }
            // Sort by priority (lower number = higher priority)
            autoUpgradeOrder.sort((a, b) => {
                let pa = this.state.letterOptions[a].autoUpgradePriority || 5;
                let pb = this.state.letterOptions[b].autoUpgradePriority || 5;
                return pa - pb;
            });

            for (let i of autoUpgradeOrder) {
                if (this.onUpgradeClick(i, -1, -1, newLetters)) {
                    updated = true;
                }
            }

            let bonus = this.getTotalBonus();
            for (let i = 1; i < newLetters.length; ++i) {
                let l = newLetters[i];
                let lp = newLetters[i - 1];
                if (l.paused) {
                    continue;
                }
                if (i == 1 || lp.count >= 10) {
                    let [cnt, mul] = this.calcInc(newLetters, i, true, false)
                    if (cnt === 0) continue;
                    let gen = Math.max(1, Math.floor(cnt * mul * bonus));
                    l.count += gen;
                    lp.count -= cnt * 10;
                    l.count = Math.round(l.count);
                    totalGenerated += gen;
                    updated = true;
                }
                this.checkForLastAutoClick(newLetters);
            }
            this.lastUpdate += 1000;
            if (newLetters.length == 1) {
                this.checkForLastAutoClick(newLetters);
            }
        }

        if (updated) {
            this.updateChange(newLetters);

            // Update stats
            let newStats = this.state.stats ? { ...this.state.stats } : new GameStats();
            newStats.totalLettersGenerated += totalGenerated;
            if (newLetters.length - 1 > newStats.highestLetter) {
                newStats.highestLetter = newLetters.length - 1;
            }

            // Check fastest Z unlock
            if (newLetters.length >= maxLettersCount && newStats.fastestZUnlock === 0) {
                let elapsed = (Date.now() - newStats.currentRunStart) / 1000;
                newStats.fastestZUnlock = elapsed;
            }

            // Update best score
            let score = this.calculateScore();
            if (score > newStats.bestScore) {
                newStats.bestScore = score;
            }

            this.setState({ letters: newLetters, stats: newStats });

            // Check achievements and challenges
            this.checkAchievements({ letters: newLetters, stats: newStats });
            this.checkChallengeCompletion(newLetters);
        }
        if (now - this.lastSave > 10000) {
            this.save();
            this.lastSave = now;
        }
        } catch (e) { console.error('onTimer error:', e); }
    }

    componentDidUpdate(prevProps: any, prevState: GameRootState) {
    }


    onLetterClick(idx: number, letters?: LetterRecord[]) {
        try {
        const needSetState = letters === undefined;
        letters = letters ? letters : this.state.letters.slice();
        let prevCount = idx < 2 ? 10 : letters[idx - 1].count;
        if (this.state.letters.length == 1) {
            this.setState({ letters: [...letters, new LetterRecord()] });
        }
        if (idx > 0 && prevCount >= 10) {
            let newLetters = letters;
            let clickBonus = Math.max(1, Math.floor(this.multipliers[idx] * this.getTotalBonus())) || 1;
            newLetters[idx].count += clickBonus;
            if (idx > 1) newLetters[idx - 1].count -= 10;
            if (idx == newLetters.length - 1 && newLetters[idx].count >= 10 && newLetters.length < maxLettersCount) {
                newLetters.push(new LetterRecord());
            }
            if (needSetState) {
                let newStats = this.state.stats ? { ...this.state.stats } : new GameStats();
                newStats.totalClicks++;
                this.updateChange(newLetters, this.state.altShiftState);
                this.setState({ letters: newLetters, stats: newStats });
                this.checkAchievements({ stats: newStats, letters: newLetters });
            }
        }
        } catch (e) { console.error('onLetterClick error:', e); }
    }

    onUpgradeClick(idx: number, count: number, minChange: number, letters?: LetterRecord[]) {
        const needSetState = letters === undefined;
        letters = letters ? letters : this.state.letters.slice();
        if (idx == letters.length - 1) {
            return;
        }

        // Feature #5: Challenge restriction
        if (this.state.challenges && this.state.challenges.active === 'minimalist' && letters[idx].level >= 10) {
            return;
        }

        if (count == 1) {
            count = this.state.letterOptions[idx].defaultPurchaseAmount;
        }
        if (minChange == -1) {
            minChange = Math.max(
                this.state.letterOptions[idx].defaultPurchaseToMaxLimit + 9,
                this.state.letterOptions[idx - 1].minimumGrowth
            );
        }
        let newLetters = letters;
        let updated = false;
        let curChange = newLetters[idx - 1].baseChange;
        let positiveChangeOnUpgrade = curChange >= 0;
        if (!needSetState) {
            positiveChangeOnUpgrade = true;
        }
        const upgradeSiffix = indexToUpgradeSuffix(idx);
        const convUpgradeName = ('convPurchase' + upgradeSiffix) as keyof Upgrades;
        const autoUpgradeName = ('autoUpgrade' + upgradeSiffix) as keyof Upgrades;
        const haveConvUpgrade = this.state.upgrades[convUpgradeName];
        const haveAutoUpgrade = this.state.upgrades[autoUpgradeName] && this.state.letterOptions[idx].enableAutoUpgrade;
        do {
            // Challenge restriction: minimalist
            if (this.state.challenges && this.state.challenges.active === 'minimalist' && newLetters[idx].level >= 10) {
                break;
            }

            let ucost = newLetters[idx].level + 1;
            let cvtUpgrade = haveConvUpgrade && ((ucost * 10 / this.multipliers[idx + 1]) < newLetters[idx].count);
            if (!cvtUpgrade && ucost > newLetters[idx + 1].count) {
                break;
            }
            if (idx > 1 && count < 0 && positiveChangeOnUpgrade && curChange <= minChange) {
                break;
            }

            if (!cvtUpgrade && haveConvUpgrade && haveAutoUpgrade && letters[idx].change > letters[idx + 1].change) {
                break;
            }

            newLetters[idx].level++;

            if (cvtUpgrade) {
                newLetters[idx].count -= ucost * 10 / this.multipliers[idx + 1];
            }
            else {
                newLetters[idx + 1].count -= ucost;
            }
            curChange -= 10;
            updated = true;
        } while (count < 0 || (--count) != 0);
        if (updated && needSetState) {
            this.updateChange(newLetters);
            this.setState({ letters: newLetters });
        }
        return updated;
    }

    // Feature #11: Max All - upgrade all letters at once
    onMaxAllClick() {
        let newLetters = this.state.letters.slice();
        let anyUpdated = false;
        for (let i = 1; i < newLetters.length - 1; i++) {
            if (this.onUpgradeClick(i, -1, -1, newLetters)) {
                anyUpdated = true;
            }
        }
        if (anyUpdated) {
            this.updateChange(newLetters);
            this.setState({ letters: newLetters });
        }
    }

    onPauseClick(idx: number) {
        // Feature #5: Challenge restriction
        if (this.state.challenges && this.state.challenges.active === 'no_pause') return;

        let newLetters = this.state.letters.slice();
        newLetters[idx].paused = !newLetters[idx].paused;
        this.updateChange(newLetters);
        this.setState({ letters: newLetters });
    }

    onOptionsClick() {
        this.setState({ optionsOpened: true });
    }

    onOptionsClose() {
        this.setState({ optionsOpened: false });
    }

    updateOptionsDiv(d: HTMLElement) {
        if (d) {
            d.style.color = '#000001';
            setTimeout(function () {
                d.style.color = '#000000';
            }, 500);
        }
    }

    onOptionsUpdate(updatedOptions: Options) {
        this.setState({ options: updatedOptions });
    }

    resetState(upgrades: Upgrades, keepPrestige?: boolean) {
        let letterOptions = createArray(maxLettersCount, LetterOptions);
        this.updateLetterOptions(letterOptions, upgrades);

        let newStats = keepPrestige ? { ...this.state.stats } : new GameStats();
        newStats.currentRunStart = Date.now();

        let stateUpdate: Partial<GameRootState> = {
            upgrades: upgrades,
            letterOptions: letterOptions,
            ascension: false,
            letters: [new LetterRecord()],
            stats: newStats as GameStats
        };

        if (!keepPrestige) {
            stateUpdate.stage = 1;
            stateUpdate.achievements = {};
            stateUpdate.challenges = { completed: {}, active: null as string };
            stateUpdate.glyphs = 0;
            stateUpdate.prestigeLevel = 0;
        }

        this.setState(stateUpdate as GameRootState);
        this.updateMultipliers(upgrades);
    }

    onHardReset() {
        this.setState({ optionsOpened: false });
        this.resetState(new Upgrades(), false);
    }

    onSoftReset() {
        this.setState({ optionsOpened: false });
        this.resetState({ ...this.state.upgrades }, true);
    }

    // Feature #1: Prestige Reset
    onPrestigeReset() {
        // Calculate glyphs earned: based on highest letter unlocked and total generation
        let highestLetter = this.state.letters.length - 1;
        let glyphsEarned = Math.max(1, Math.floor(highestLetter / 3));

        let newGlyphs = this.state.glyphs + glyphsEarned;
        let newPrestigeLevel = this.state.prestigeLevel + 1;

        let newStats = { ...this.state.stats };
        newStats.totalPrestigeResets++;
        newStats.currentRunStart = Date.now();
        newStats.timePlayed += (Date.now() - this.state.stats.currentRunStart) / 1000;

        this.setState({
            glyphs: newGlyphs,
            prestigeLevel: newPrestigeLevel,
            stats: newStats,
            optionsOpened: false
        });
        this.resetState({ ...this.state.upgrades }, true);
        this.showNotification(`Prestige! Earned ${glyphsEarned} Glyphs (total: ${newGlyphs})`);
        this.checkAchievements({ prestigeLevel: newPrestigeLevel });
    }

    onAscendClick() {
        this.setState({ ascension: true });
    }

    onBuyUpgrade(key: keyof Upgrades) {
        let newUpgrades = { ...this.state.upgrades };
        newUpgrades[key] = true;

        // Challenge restriction: no_mult
        if (this.state.challenges && this.state.challenges.active === 'no_mult' && key.substr(0, 4) === 'mult') {
            return;
        }

        this.resetState(newUpgrades, true);
    }

    onTranscendClick() {
        this.setState({ stage: this.state.stage + 1, ascension: false });
    }

    // Feature #14: New Game+
    onNewGamePlus() {
        let newStats = { ...this.state.stats };
        newStats.currentRunStart = Date.now();
        newStats.timePlayed += (Date.now() - this.state.stats.currentRunStart) / 1000;

        let letterOptions = createArray(maxLettersCount, LetterOptions);
        this.updateLetterOptions(letterOptions, this.state.upgrades);

        this.setState({
            letters: [new LetterRecord()],
            letterOptions: letterOptions,
            ascension: false,
            stats: newStats,
            stage: this.state.stage + 1
        });
        this.updateMultipliers(this.state.upgrades);
        this.showNotification('New Game+! Base generation x' + Math.pow(2, this.state.stage));
    }

    // Feature #5: Start challenge
    onStartChallenge(id: string) {
        let newChallenges = { ...this.state.challenges, active: id };
        let newStats = { ...this.state.stats };
        newStats.currentRunStart = Date.now();

        this.setState({
            challenges: newChallenges,
            stats: newStats,
            letters: [new LetterRecord()],
            optionsOpened: false
        });
        this.showNotification('Challenge started: ' + challengeById(id).name);
    }

    onAbandonChallenge() {
        let newChallenges = { ...this.state.challenges, active: null as string };
        this.setState({ challenges: newChallenges });
        this.showNotification('Challenge abandoned');
    }

    onLetterOptionsClick(idx: number) {
        this.setState({ letterOptionsOpened: true, letterOptionsIdx: idx });
    }

    onLetterOptionsClose() {
        this.setState({ letterOptionsOpened: false });
    }

    onLetterOptionsUpdate(idx: number, newOptions: LetterOptions) {
        let optionsArray = [...this.state.letterOptions];
        optionsArray[idx] = newOptions;
        this.setState({ letterOptions: optionsArray });
    }

    onChangeAltShiftState(newAltShiftState:AltShiftState) {
        let newLetters = this.state.letters.slice();
        this.updateChange(newLetters, newAltShiftState);
        this.setState({altShiftState: newAltShiftState, letters:newLetters});
    }

    render() {
        let mainComponent: JSX.Element;

        if (this.state.stage > 1 && this.state.letters.length <= 1 && !this.state.ascension) {
            // Check if we just transcended (no letters yet in new stage)
            // If stage > 1 and we have progress, show normal game
        }

        let showTranscendScreen = this.state.stage > 1 &&
            this.state.letters.length >= maxLettersCount &&
            this.state.letters[this.state.letters.length - 1].count >= 10;

        if (showTranscendScreen && !this.state.ascension) {
            mainComponent = <TranscendComponent
                stage={this.state.stage}
                onNewGamePlus={() => this.onNewGamePlus()}
            />;
        }
        else if (this.state.ascension) {
            mainComponent =
                <AscensionComponent
                    upgrades={this.state.upgrades}
                    onBuyUpgrade={(key: keyof Upgrades) => this.onBuyUpgrade(key)}
                    onTranscendClick={() => this.onTranscendClick()}
                />;
        }
        else {
            let synergyMult = this.getSynergyMultiplier();
            mainComponent =
                <MainGame
                    letters={this.state.letters}
                    letterOptions={this.state.letterOptions}
                    options={this.state.options}
                    altShiftState={this.state.altShiftState}
                    synergyActive={synergyMult > 1}
                    synergyMult={synergyMult}
                    onLetterClick={(idx) => this.onLetterClick(idx)}
                    onUpgradeClick={(idx, max, min) => this.onUpgradeClick(idx, max, min)}
                    onPauseClick={(idx) => this.onPauseClick(idx)}
                    onAscendClick={() => this.onAscendClick()}
                    showMaxAll={this.state.letters.length >= 5}
                    onMaxAllClick={() => this.onMaxAllClick()}
                    onLetterOptionsChanged={(idx, newOptions) => this.onLetterOptionsUpdate(idx, newOptions)}
                    onChangeAltShiftState={(newAltShiftState)=>this.onChangeAltShiftState(newAltShiftState)}
                />;
        }

        let optionsDlg = this.state.optionsOpened &&
            <div className="settingsOverlay" onClick={() => this.onOptionsClose()}>
                <div className="settingsModal" onClick={(e) => e.stopPropagation()}>
                    <div ref={(d) => this.updateOptionsDiv(d)}>
                        <OptionsComponent
                            options={this.state.options}
                            onChange={(updatedOptions: Options) => this.onOptionsUpdate(updatedOptions)}
                            onClose={() => this.onOptionsClose()}
                            onHardReset={() => this.onHardReset()}
                            onSoftReset={() => this.onSoftReset()}
                            onExportSave={() => this.onExportSave()}
                            onImportSave={(data) => this.onImportSave(data)}
                            glyphs={this.state.glyphs}
                            prestigeLevel={this.state.prestigeLevel}
                            stats={this.state.stats}
                            currentLetters={this.state.letters.length - 1}
                            currentScore={this.calculateScore()}
                            achievements={this.state.achievements || {}}
                        />
                    </div>
                </div>
            </div>;

        // Challenges modal (standalone)
        let challengesDlg = this.state.showChallenges &&
            <div className="settingsOverlay" onClick={() => this.setState({ showChallenges: false })}>
                <div className="settingsModal" onClick={(e) => e.stopPropagation()}>
                    <ChallengesComponent
                        challenges={this.state.challenges}
                        onStartChallenge={(id) => this.onStartChallenge(id)}
                        onAbandonChallenge={() => this.onAbandonChallenge()}
                    />
                </div>
            </div>;

        // Prestige modal (standalone)
        let prestigeDlg = this.state.showPrestige &&
            <div className="settingsOverlay" onClick={() => this.setState({ showPrestige: false })}>
                <div className="settingsModal" onClick={(e) => e.stopPropagation()}>
                    <PrestigeComponent
                        glyphs={this.state.glyphs}
                        prestigeLevel={this.state.prestigeLevel}
                        onPrestigeReset={() => { this.onPrestigeReset(); this.setState({ showPrestige: false }); }}
                    />
                </div>
            </div>;

        let letterOptionsDlg = null;

        // Challenge banner
        let challengeBanner = this.state.challenges && this.state.challenges.active && (
            <div className="challengeBanner">
                Challenge: {challengeById(this.state.challenges.active).name}
            </div>
        );

        // Notification toast
        let notificationToast = this.state.notification && (
            <div key={this.state.notificationKey} className="notificationToast">{this.state.notification}</div>
        );

        // Prestige/score info bar
        let infoBar = ((this.state.glyphs || 0) > 0 || (this.state.stage || 1) > 1) && (
            <div className="infoBar">
                {this.state.glyphs > 0 && <span className="infoPill">Glyphs: {this.state.glyphs}</span>}
                {this.state.stage > 1 && <span className="infoPill">NG+{this.state.stage - 1}</span>}
                <span className="infoPill">x{this.getTotalBonus().toFixed(1)} bonus</span>
            </div>
        );

        // Unlock conditions
        let hasAnyUpgrade = this.state.upgrades && getKeys(this.state.upgrades).some(k => this.state.upgrades[k]);
        let showChallengesButton = hasAnyUpgrade;
        let allUpgradesOwned = this.state.upgrades && getKeys(this.state.upgrades).every(k => this.state.upgrades[k]);
        let showPrestigeButton = allUpgradesOwned || (this.state.prestigeLevel || 0) > 0;

        return (
            <div className="cell">
                <div className="topBar">
                    {process.env.NODE_ENV !== 'production' && <MiniButton className="topBarButton" normalColor={this.state.debugAutoPlay ? "#ff4444" : "#EEEEEE"} onClick={() => this.toggleDebugAutoPlay()}>
                        <i className="material-icons topBarIcon">{this.state.debugAutoPlay ? 'stop' : 'fast_forward'}</i>
                    </MiniButton>}
                    {showPrestigeButton && <MiniButton className="topBarButton" normalColor="#EEEEEE" onClick={() => this.setState({ showPrestige: true })}>
                        <i className="material-icons topBarIcon">auto_awesome</i>
                    </MiniButton>}
                    {showChallengesButton && <MiniButton className="topBarButton" normalColor="#EEEEEE" onClick={() => this.setState({ showChallenges: true })}>
                        <i className="material-icons topBarIcon">flag</i>
                    </MiniButton>}
                    <MiniButton className="topBarButton" normalColor="#EEEEEE" onClick={() => this.onOptionsClick()}>
                        <i className="material-icons topBarIcon">settings</i>
                    </MiniButton>
                </div>
                {this.state.debugAutoPlay && (
                    <div className="debugBanner">DEBUG AUTO-PLAY</div>
                )}
                {infoBar}
                {challengeBanner}
                {notificationToast}
                {optionsDlg}
                {challengesDlg}
                {prestigeDlg}
                {letterOptionsDlg}
                <div className="container">{mainComponent}</div>
            </div>
        );
    }
}
