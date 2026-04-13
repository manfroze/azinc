import * as React from "react";
import { format } from 'swarm-numberformat';

export class GameStats {
    totalClicks: number = 0;
    totalLettersGenerated: number = 0;
    timePlayed: number = 0;
    currentRunStart: number = Date.now();
    fastestZUnlock: number = 0;
    totalPrestigeResets: number = 0;
    highestLetter: number = 0;
    bestScore: number = 0;
}

function formatTime(seconds: number): string {
    if (seconds <= 0) return '0s';
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = Math.floor(seconds % 60);
    let parts = [];
    if (h > 0) parts.push(h + 'h');
    if (m > 0) parts.push(m + 'm');
    parts.push(s + 's');
    return parts.join(' ');
}

interface StatisticsProps {
    stats: GameStats;
    currentLetters: number;
    currentScore: number;
    numberFormat: string;
}

export class StatisticsComponent extends React.Component<StatisticsProps, undefined> {
    render() {
        let s = this.props.stats;
        let fmt = this.props.numberFormat;
        let now = Date.now();
        let currentRunTime = (now - s.currentRunStart) / 1000;
        let totalTime = s.timePlayed + currentRunTime;

        let rows: Array<{ label: string, value: string }> = [
            { label: 'Total time played', value: formatTime(totalTime) },
            { label: 'Current run time', value: formatTime(currentRunTime) },
            { label: 'Total clicks', value: format(s.totalClicks, { format: fmt, flavor: 'short' }) },
            { label: 'Total letters generated', value: format(s.totalLettersGenerated, { format: fmt, flavor: 'short' }) },
            { label: 'Letters unlocked', value: String(this.props.currentLetters) },
            { label: 'Prestige resets', value: String(s.totalPrestigeResets) },
            { label: 'Fastest Z unlock', value: s.fastestZUnlock > 0 ? formatTime(s.fastestZUnlock) : 'N/A' },
            { label: 'Current score', value: format(this.props.currentScore, { format: fmt, flavor: 'short' }) },
            { label: 'Best score', value: format(s.bestScore, { format: fmt, flavor: 'short' }) },
        ];

        return (
            <div>
                <table className="statsTable">
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i}>
                                <td className="statsLabel">{r.label}</td>
                                <td className="statsValue">{r.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
}
