import * as React from "react";
import { StatisticsComponent, GameStats } from './Statistics';
import { AchievementData, AchievementsComponent } from './Achievements';
import { ChallengeState } from './Challenges';

type NumberFormat = 'standard' | 'scientific' | 'engineering';
export class Options {
    numberFormat: NumberFormat = 'standard';
    showTooltips = true;
    showAltShiftIndicator = false;
}

const numFormatOptions = [
    { name: 'Standard', value: 'standard' },
    { name: 'Scientific', value: 'scientific' },
    { name: 'Engineering', value: 'engineering' }
]

export class HoverTooltip extends React.Component<{text?: string, html?: string}, {show: boolean, x: number, y: number}> {
    constructor() {
        super();
        this.state = { show: false, x: 0, y: 0 };
    }
    onEnter = (e: React.MouseEvent<HTMLElement>) => {
        let rect = e.currentTarget.getBoundingClientRect();
        this.setState({ show: true, x: rect.left + rect.width / 2, y: rect.top - 6 });
    }
    onLeave = () => { this.setState({ show: false }); }
    render() {
        let content = this.props.text || this.props.html;
        if (!content) return (this.props as any).children;
        let inner = this.props.html
            ? <div className="hoverExplainText" style={{ left: this.state.x, top: this.state.y }} dangerouslySetInnerHTML={{ __html: this.props.html }} />
            : <div className="hoverExplainText" style={{ left: this.state.x, top: this.state.y }}>{this.props.text}</div>;
        return (
            <span onMouseEnter={this.onEnter} onMouseLeave={this.onLeave} style={{display: 'inline-block'}}>
                {(this.props as any).children}
                {this.state.show && inner}
            </span>
        );
    }
}

type SettingsTab = 'settings' | 'stats' | 'achievements' | 'challenges';

interface OptionsProps {
    options: Options;
    onChange: (updatedOptions: Options) => void;
    onClose: () => void;
    onHardReset: () => void;
    onSoftReset: () => void;
    onExportSave: () => string;
    onImportSave: (data: string) => void;
    glyphs: number;
    prestigeLevel: number;
    // Sub-panel props
    stats: GameStats;
    currentLetters: number;
    currentScore: number;
    achievements: AchievementData;
}

interface OptionsState {
    activeTab: SettingsTab;
    showHardConfirm: boolean;
    showSoftConfirm: boolean;
    exportData: string;
    importData: string;
    showImportConfirm: boolean;
    importMessage: string;
}

const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'settings', label: 'Settings' },
    { key: 'stats', label: 'Stats' },
    { key: 'achievements', label: 'Achievements' },
];

export class OptionsComponent extends React.Component<OptionsProps, OptionsState> {
    constructor() {
        super();
        this.state = {
            activeTab: 'settings',
            showHardConfirm: false,
            showSoftConfirm: false,
            exportData: '',
            importData: '',
            showImportConfirm: false,
            importMessage: ''
        }
    }

    onNumFormatChange(event: React.ChangeEvent<HTMLSelectElement>) {
        let updatedOptions = {...this.props.options};
        updatedOptions.numberFormat = event.target.value as NumberFormat;
        this.props.onChange(updatedOptions);
    }

    onTooltipChange(event: React.ChangeEvent<HTMLInputElement>)
    {
        let updatedOptions = {...this.props.options};
        updatedOptions.showTooltips = event.target.checked;
        this.props.onChange(updatedOptions);
    }

    onAltShiftInfChange(event: React.ChangeEvent<HTMLInputElement>)
    {
        let updatedOptions = {...this.props.options};
        updatedOptions.showAltShiftIndicator = event.target.checked;
        this.props.onChange(updatedOptions);
    }

    onHardResetClick() {
        this.setState({ showHardConfirm: true });
    }

    onSoftResetClick() {
        this.setState({ showSoftConfirm: true });
    }

    onNevermindHardClick() {
        this.setState({ showHardConfirm: false });
    }

    onNevermindSoftClick() {
        this.setState({ showSoftConfirm: false });
    }

    onExportClick() {
        let data = this.props.onExportSave();
        this.setState({ exportData: data });
    }

    onImportClick() {
        if (this.state.importData.trim()) {
            this.setState({ showImportConfirm: true });
        }
    }

    onConfirmImport() {
        try {
            this.props.onImportSave(this.state.importData);
            this.setState({ importMessage: 'Import successful!', showImportConfirm: false, importData: '' });
        } catch (e) {
            this.setState({ importMessage: 'Invalid save data!', showImportConfirm: false });
        }
    }

    renderSettingsTab() {
        return (
            <div>
                <div className="settingsSection">
                    <div className="settingsSectionTitle">General</div>
                    <div className="settingsRow">
                        <span className="settingsRowLabel">Numbers format</span>
                        <select className="settingsSelect" value={this.props.options.numberFormat} onChange={(event) => this.onNumFormatChange(event)}>
                            {
                                numFormatOptions.map((no) => <option key={no.value} value={no.value}>{no.name}</option>)
                            }
                        </select>
                    </div>
                    <div className="settingsRow">
                        <span className="settingsRowLabel">Show tooltips</span>
                        <input className="settingsCheckbox" type="checkbox" checked={this.props.options.showTooltips} onChange={(event)=>this.onTooltipChange(event)}/>
                    </div>
                    <div className="settingsRow">
                        <span className="settingsRowLabel">Show shift&amp;alt indicator</span>
                        <input className="settingsCheckbox" type="checkbox" checked={this.props.options.showAltShiftIndicator} onChange={(event)=>this.onAltShiftInfChange(event)}/>
                    </div>
                </div>

                {/* Import/Export */}
                <div className="settingsSection">
                    <div className="settingsSectionTitle">Save Data</div>
                    <div style={{marginBottom: '8px'}}>
                        <button className="navButton" onClick={() => this.onExportClick()}>Export Save</button>
                    </div>
                    {this.state.exportData && (
                        <div>
                            <textarea className="saveTextarea" readOnly value={this.state.exportData}
                                onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
                        </div>
                    )}
                    <div style={{marginTop: '8px'}}>
                        <textarea className="saveTextarea" placeholder="Paste save data here..."
                            value={this.state.importData}
                            onChange={(e) => this.setState({ importData: e.target.value, importMessage: '' })} />
                        <button className="navButton" onClick={() => this.onImportClick()}>Import Save</button>
                        {this.state.showImportConfirm && (
                            <div className="settingsConfirm">
                                <div style={{fontSize: '13px', margin: '5px 0'}}>This will overwrite your current save!</div>
                                <button onClick={() => this.onConfirmImport()} className="hardResetButton">Confirm Import</button>
                                <button onClick={() => this.setState({ showImportConfirm: false })} className="nevermindButton">Nevermind</button>
                            </div>
                        )}
                        {this.state.importMessage && (
                            <div style={{fontSize: '14px', marginTop: '5px', color: this.state.importMessage.indexOf('success') >= 0 ? '#4f4' : '#f44'}}>
                                {this.state.importMessage}
                            </div>
                        )}
                    </div>
                </div>

                <div className="settingsActions settingsActionsRow">
                    <div className="resetButtonGroup">
                        <HoverTooltip text="Restart your run. Keeps upgrades, glyphs, and prestige.">
                            <button onClick={() => this.onSoftResetClick()} className="softResetButton">SOFT RESET</button>
                        </HoverTooltip>
                        {this.state.showSoftConfirm && (
                            <div className="settingsConfirm">
                                <button onClick={this.props.onSoftReset} className="softResetButton">Confirm SOFT RESET</button>
                                <button onClick={() => this.onNevermindSoftClick()} className="nevermindButton">Nevermind</button>
                            </div>
                        )}
                    </div>
                    <div className="resetButtonGroup">
                        <HoverTooltip text="Erase everything. Resets all upgrades, glyphs, and progress.">
                            <button onClick={() => this.onHardResetClick()} className="hardResetButton">HARD RESET</button>
                        </HoverTooltip>
                        {this.state.showHardConfirm && (
                            <div className="settingsConfirm">
                                <button onClick={this.props.onHardReset} className="hardResetButton">Confirm HARD RESET</button>
                                <button onClick={() => this.onNevermindHardClick()} className="nevermindButton">Nevermind</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    renderTabContent() {
        switch (this.state.activeTab) {
            case 'stats':
                return <StatisticsComponent
                    stats={this.props.stats}
                    currentLetters={this.props.currentLetters}
                    currentScore={this.props.currentScore}
                    numberFormat={this.props.options.numberFormat}
                />;
            case 'achievements':
                return <AchievementsComponent
                    achievements={this.props.achievements}
                />;
            default:
                return this.renderSettingsTab();
        }
    }

    render() {
        return (
            <div className="settingsPanel">
                <div className="settingsHeader">
                    <div className="settingsTabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                className={'settingsTab' + (this.state.activeTab === tab.key ? ' settingsTabActive' : '')}
                                onClick={() => this.setState({ activeTab: tab.key })}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button className="settingsCloseBtn" onClick={this.props.onClose}>X</button>
                </div>
                <div className="settingsBody">
                    {this.renderTabContent()}
                </div>
            </div>
        )
    }
}
