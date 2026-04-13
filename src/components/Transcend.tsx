import * as React from "react";
import { MiniButton } from './MiniButton';

interface TranscendProps {
    stage: number;
    onNewGamePlus: () => void;
}

export class TranscendComponent extends React.Component<TranscendProps, any> {
    render() {
        let stars = '';
        for (let i = 0; i < this.props.stage - 1; i++) stars += '\u2605';

        return (
            <div className="transcendPanel">
                <div className="transcendTitle">Congratulations!</div>
                <div className="transcendStars">{stars}</div>
                <div className="transcendText">
                    You have transcended{this.props.stage > 2 ? ` ${this.props.stage - 1} times` : ''}!
                </div>
                <div className="transcendText" style={{marginTop: '15px'}}>
                    Each transcendence doubles your base generation rate.
                </div>
                <div className="transcendText">
                    Current bonus: x{Math.pow(2, this.props.stage - 1)} base generation
                </div>
                <div style={{marginTop: '20px'}}>
                    <MiniButton borderColor="#bc42f5" onClick={this.props.onNewGamePlus}>
                        <span style={{fontSize: '18px', padding: '5px 15px', display: 'inline-block'}}>
                            New Game+ {stars}\u2605
                        </span>
                    </MiniButton>
                </div>
                <div className="transcendHint">
                    Start over with all upgrades, prestige, and a {Math.pow(2, this.props.stage)}x generation bonus
                </div>
            </div>
        );
    }
}
