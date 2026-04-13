import * as React from "react";

interface PrestigeProps {
    glyphs: number;
    prestigeLevel: number;
    onPrestigeReset: () => void;
}

interface PrestigeState {
    showConfirm: boolean;
}

export class PrestigeComponent extends React.Component<PrestigeProps, PrestigeState> {
    constructor() {
        super();
        this.state = { showConfirm: false };
    }

    render() {
        return (
            <div className="settingsPanel">
                <h3 style={{ margin: '0 0 10px 0' }}>Prestige</h3>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                    Glyphs: {this.props.glyphs}
                </div>
                <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                    Level: {this.props.prestigeLevel}
                </div>
                {this.props.glyphs > 0 && (
                    <div style={{ fontSize: '16px', marginBottom: '15px', color: '#4f4' }}>
                        Bonus: +{this.props.glyphs * 5}% generation
                    </div>
                )}
                <div style={{ fontSize: '14px', marginBottom: '15px', color: '#999' }}>
                    Prestige resets your letters but keeps upgrades.
                    You earn Glyphs based on progress. Each Glyph gives +5% generation.
                </div>
                {!this.state.showConfirm ? (
                    <button className="prestigeButton" onClick={() => this.setState({ showConfirm: true })}>
                        PRESTIGE RESET
                    </button>
                ) : (
                    <div>
                        <button className="prestigeButton" onClick={() => { this.props.onPrestigeReset(); this.setState({ showConfirm: false }); }}>
                            Confirm PRESTIGE
                        </button>
                        <button className="nevermindButton" onClick={() => this.setState({ showConfirm: false })}>
                            Nevermind
                        </button>
                    </div>
                )}
            </div>
        );
    }
}
