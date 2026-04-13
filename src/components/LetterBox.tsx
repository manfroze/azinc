import * as React from "react";

import { LetterRecord } from './MainGame';
import { Options } from './Options';
import { format } from 'swarm-numberformat';
import { HoverTooltip } from './Options';
import { MiniButton } from './MiniButton';
import {AltShiftState} from './GameRoot';
import {LetterOptions} from './LetterOptions';


interface LetterBoxProps {
    sym: string;
    idx: number;
    letter: LetterRecord;
    letterOptions: LetterOptions;

    altShiftState: AltShiftState;

    ascend?: boolean;

    options: Options;

    onClick: (idx: number) => void;
    onUpgradeClick: (idx: number, count: number, min: number) => void;
    onPauseClick: (idx: number) => void;
    onAscendClick: () => void;
    onLetterOptionsChanged: (idx: number, newOptions: LetterOptions) => void;
}

interface LetterBoxState {
    flipped: boolean;
    hasFlipped: boolean;
    levelUpAnim: boolean;
}

export class LetterBox extends React.Component<LetterBoxProps, LetterBoxState> {
    constructor() {
        super();
        this.state = { flipped: false, hasFlipped: false, levelUpAnim: false };
    }
    componentWillReceiveProps(nextProps: LetterBoxProps) {
        if (nextProps.letter.level > this.props.letter.level) {
            this.setState({ levelUpAnim: true });
            setTimeout(() => this.setState({ levelUpAnim: false }), 600);
        }
    }
    onUpgradeClick(e: React.MouseEvent<HTMLElement>) {
        this.props.onUpgradeClick(this.props.idx, e.altKey ? 100 : e.shiftKey ? 10 : 1, 10);
    }
    onMaxUpgradeClick(e: React.MouseEvent<HTMLElement>) {
        this.props.onUpgradeClick(this.props.idx, -1, e.altKey ? 1009 : e.shiftKey ? 109 : -1);
    }
    render() {
        if (this.props.idx == 0) {
            return (
                <div className="letterBoxDiv" onClick={() => this.props.onClick(this.props.idx)}>
                    <div className="letterDivInf">{this.props.sym}</div>
                    {
                        this.props.ascend &&
                        <MiniButton borderColor="red" onClick={this.props.onAscendClick}>
                            <span className="smallText">Ascend</span>
                        </MiniButton>
                    }
                </div>
            )
        }
        else {
            let pauseButtonSym = this.props.letter.paused ? 'play_arrow' : 'pause';
            let fmt = this.props.options.numberFormat;
            let l = this.props.letter;
            let lc = format(l.change, { format: fmt, flavor: 'short' });
            let change = l.change > 0 ? '+' + lc : lc;
            let gen = format(l.generating, { format: fmt, flavor: 'short' });
            let spend = format(l.spending, { format: fmt, flavor: 'short' });
            let count = format(this.props.letter.count, { format: fmt, flavor: 'short' });
            let countRaw = this.props.letter.count.toString();
            let addStyle = this.props.letter.paused ? " letterBoxDivPaused" : "";
            let animClass = this.state.levelUpAnim ? " levelUpAnim" : "";

            // Progress bar: how close to next 10-unit threshold
            let progressPct = Math.min(100, Math.max(0, (this.props.letter.count % 10) / 10 * 100));
            if (this.props.letter.count >= 10) progressPct = 100;

            let ttUpgradeOnce = '';
            let ttUpgradeMax = '';
            let ttCount = '';
            let ttPause = '';
            let ttChange = '';

            let dots = [];
            for(let x = 0; x < this.props.letter.mult; ++x){
                dots.push("\u2022");
            }

            let letters = '\u221EABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let prevSym = letters[this.props.idx - 1] || '?';
            let nextSym = letters[this.props.idx + 1] || '?';
            let letterColors: {[key: string]: string} = {
                '\u221E': '#c7c7c7',
                'A': '#f54242', 'B': '#f54242', 'C': '#f54242', 'D': '#f54242', 'E': '#f54242',
                'F': '#4287f5', 'G': '#4287f5', 'H': '#4287f5', 'I': '#4287f5', 'J': '#4287f5',
                'K': '#00d162', 'L': '#00d162', 'M': '#00d162', 'N': '#00d162', 'O': '#00d162',
                'P': '#f5cb42', 'Q': '#f5cb42', 'R': '#f5cb42', 'S': '#f5cb42', 'T': '#f5cb42',
                'U': '#bc42f5', 'V': '#bc42f5', 'W': '#bc42f5', 'X': '#bc42f5', 'Y': '#bc42f5', 'Z': '#bc42f5'
            };
            let pill = (s: string) => {
                let c = letterColors[s] || '#c7c7c7';
                return `<span class="ttPill" style="background:${c}33;border-color:${c}88">${s}</span>`;
            };

            if (this.props.options.showTooltips) {
                let upgradeAmount = 1;
                if (this.props.altShiftState.shiftDown) {
                    upgradeAmount = 10;
                }
                else if (this.props.altShiftState.altDown) {
                    upgradeAmount = 100;
                }
                let upgradeCost = (this.props.letter.level * upgradeAmount);
                upgradeCost += ((upgradeAmount * (upgradeAmount + 1)) / 2);
                ttUpgradeOnce = `Buy ${upgradeAmount} converter${upgradeAmount>1?'s':''} for ${upgradeCost} ${pill(nextSym)}<br>` +
                    `Converts 10 ${pill(prevSym)} \u2192 ${this.props.letter.mult} ${pill(this.props.sym)} per sec<br>` +
                    `<span class="ttHint">Shift \u00d710 \u00b7 Alt \u00d7100</span>`;
                let max = this.props.altShiftState.shiftDown ? 100 : this.props.altShiftState.altDown ? 1000 : this.props.letterOptions.defaultPurchaseToMaxLimit;
                ttUpgradeMax = `Buy max converters, keep ${pill(prevSym)} production above ${max}<br>` +
                    `<span class="ttHint">Shift: above 100 \u00b7 Alt: above 1000</span>`;
                ttCount = countRaw;
                ttPause = this.props.letter.paused ? 'Unpause' : 'Pause';
                ttChange = `+${gen} from ${pill(prevSym)} converters<br>` +
                    `-${spend} to ${pill(nextSym)} converters<br>` +
                    `Net: ${this.props.letter.baseChange}/sec`;
            }

            let lo = this.props.letterOptions;
            let amountArray = [1,10,20,50,100,200,500,1000,2000,5000];

            return (
                <div className={"tileFlipContainer" + (this.state.flipped ? " flipped" : this.state.hasFlipped ? " unflipped" : "")}>
                <div className={"letterBoxDiv tileFront letter-" + this.props.sym + addStyle + animClass} onClick={() => this.props.onClick(this.props.idx)}>

                    {/* Progress bar */}
                    <div className="progressBarBg">
                        <div className="progressBarFill" style={{ width: progressPct + '%' }}></div>
                    </div>

                    <MiniButton className="pause" borderless={true} onClick={() => this.props.onPauseClick(this.props.idx)}>
                            <HoverTooltip text={ttPause}><span className="smallText"><i className="material-icons">{pauseButtonSym}</i></span></HoverTooltip>
                    </MiniButton>

                    <MiniButton className="settings" borderless={true} onClick={(e) => { e.stopPropagation(); this.setState({ flipped: true, hasFlipped: true }); }}>
                        <span className="smallText"><i className="material-icons">settings</i></span>
                    </MiniButton>

                    <div className="letterDiv">
                        {this.props.sym}
                    </div>

                    <div className="countDiv">
                        <HoverTooltip text={ttCount}><div className="count">{count}</div></HoverTooltip>
                        <HoverTooltip html={ttChange}><div className="change">{change}</div></HoverTooltip>
                    </div>

                    <div className="autoConv">
                    <div className="title">
                        <span className="from">10 </span>
                        <span className="dots">{dots}</span>
                        <span className="mult"> {this.props.letter.mult}</span>
                    </div>


                    <div className="action">

                    <MiniButton className="add smallText" disabled={!this.props.letter.canUpgrade} onClick={(e) => this.onUpgradeClick(e)}>
                        <HoverTooltip html={ttUpgradeOnce}><span><i className="material-icons">add</i></span></HoverTooltip>
                    </MiniButton>

                    <div className="level"> {this.props.letter.level} </div>

                    <MiniButton className="max smallText" disabled={!this.props.letter.canUpgradeMax} onClick={(e) => this.onMaxUpgradeClick(e)}>
                        <HoverTooltip html={ttUpgradeMax}><span><i className="material-icons">arrow_upward</i></span></HoverTooltip>
                    </MiniButton>

                    </div>

                    </div>

                </div>
                <div className={"letterBoxDiv tileBack letter-" + this.props.sym}>
                    <MiniButton className="settings" borderless={true} onClick={(e) => { e.stopPropagation(); this.setState({ flipped: false }); }}>
                        <span className="smallText"><i className="material-icons">close</i></span>
                    </MiniButton>
                    <div className="letterDiv" style={{fontSize: '20px'}}>{this.props.sym}</div>
                    <div className="tileSettings">
                        {lo.haveAutoUpgrade && <div className="tileSettingsRow">
                            <span className="tileSettingsLabel">Auto purchase</span>
                            <input className="settingsCheckbox" type="checkbox" checked={lo.enableAutoUpgrade}
                                onChange={(e) => {
                                    let newOpts = {...lo, enableAutoUpgrade: e.target.checked};
                                    this.props.onLetterOptionsChanged(this.props.idx, newOpts);
                                }}/>
                        </div>}
                        <div className="tileSettingsRow">
                            <span className="tileSettingsLabel"><i className="material-icons" style={{fontSize: '14px', verticalAlign: 'middle'}}>add</i> amount</span>
                            <select className="settingsSelect" value={lo.defaultPurchaseAmount}
                                onChange={(e) => {
                                    let newOpts = {...lo, defaultPurchaseAmount: parseInt(e.target.value)};
                                    this.props.onLetterOptionsChanged(this.props.idx, newOpts);
                                }}>
                                {amountArray.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div className="tileSettingsRow">
                            <span className="tileSettingsLabel"><i className="material-icons" style={{fontSize: '14px', verticalAlign: 'middle'}}>arrow_upward</i> keep above</span>
                            <select className="settingsSelect" value={lo.defaultPurchaseToMaxLimit}
                                onChange={(e) => {
                                    let newOpts = {...lo, defaultPurchaseToMaxLimit: parseInt(e.target.value)};
                                    this.props.onLetterOptionsChanged(this.props.idx, newOpts);
                                }}>
                                {amountArray.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        {lo.haveAutoUpgrade && <div className="tileSettingsRow">
                            <span className="tileSettingsLabel">Priority</span>
                            <select className="settingsSelect" value={lo.autoUpgradePriority || 5}
                                onChange={(e) => {
                                    let newOpts = {...lo, autoUpgradePriority: parseInt(e.target.value)};
                                    this.props.onLetterOptionsChanged(this.props.idx, newOpts);
                                }}>
                                {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}{n===1?' (high)':n===10?' (low)':''}</option>)}
                            </select>
                        </div>}
                        {lo.haveAutoUpgrade && <div className="tileSettingsRow">
                            <span className="tileSettingsLabel">Auto if prev &gt;</span>
                            <select className="settingsSelect" value={lo.autoUpgradeCondition || 0}
                                onChange={(e) => {
                                    let newOpts = {...lo, autoUpgradeCondition: parseInt(e.target.value)};
                                    this.props.onLetterOptionsChanged(this.props.idx, newOpts);
                                }}>
                                {[0,10,50,100,500,1000,5000,10000].map((n) => <option key={n} value={n}>{n === 0 ? 'Always' : n + '/s'}</option>)}
                            </select>
                        </div>}
                    </div>
                </div>
                </div>
            )
        }
    }
}
