'use strict';

import React from 'react';
import moment from 'moment';
import io from 'socket.io-client';

export default class IndexPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            now: moment().format("hhmmssdA"),
            alarm: "",
            tweet: "",
            buzz: false
        };
        this.tick = this.tick.bind(this);
    }
    tick() {
        this.setState({
            now: moment().format("hhmmssdA")
        });
        if(this.state.now.slice(0,4) === this.state.alarm){
          this.setState({
            buzz: true
          });
        }
        if(this.state.buzz){
           console.log('BUZZZ');
        }
    }
    componentDidMount() {
        let that = this;
        this.interval = setInterval(this.tick, 1000);
        let socket = io('http://localhost:3000');
        
        socket.on('tweet', function(data) {
            console.log('tweet', data);
            that.setState({tweet: data});
        });
        socket.on('set', function(data) {
            console.log('set', data);
            that.setState({alarm: data});
        });
        socket.on('stop', function(data) {
            console.log('stop', data);
            that.setState({alarm: "", buzz: false});
        });
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }
    render() {
        const now = this.state.now;
        const dow = (now[6] - 1) > 0 ? now[6] - 1 : 6;
        const digit_to_name = 'zero one two three four five six seven eight nine'.split(' ');
        const weekday_names = 'MON TUE WED THU FRI SAT SUN'.split(' ');
        const positions = [
            'h1', 'h2', ':', 'm1', 'm2', ':', 's1', 's2'
        ];

        return (
            <div className="home">
                {this.state.buzz && <audio ref="alarm-ring" autoPlay="autoplay" loop>
                  <source src="audio/ticktac.mp3" type="audio/mpeg" />
                  <source src="audio/ticktac.ogg" type="audio/ogg" />
                </audio>}
                
                <div id="clock" className="light dark">
                    <div className="display">
                        <div className="weekdays">
                            {weekday_names.map(function(o, i) {
                                let active = (i == dow) ? "active" : "";
                                return <span key={o} className={active}>{o}</span>;
                            })}
                        </div>
                        <div className="ampm">{now[7] + now[8]}</div>
                        {(this.state.alarm.length > 0) && <div className="alarm active"></div>}
                        {(this.state.alarm.length === 0) && <div className="alarm"></div>}
                        <div className="digits">
                            {positions.map(function(o, i) {
                                if (o === ':') {
                                    return <div key={o + i} className="dots"></div>;
                                } else {
                                    if (i > 2 && i < 5) {
                                        i -= 1;
                                    } else if (i > 5) {
                                        i -= 2;
                                    }
                                    return <div key={o} className={digit_to_name[now[i]]}>
                                        <span className="d1"></span>
                                        <span className="d2"></span>
                                        <span className="d3"></span>
                                        <span className="d4"></span>
                                        <span className="d5"></span>
                                        <span className="d6"></span>
                                        <span className="d7"></span>
                                        <span className="d8"></span>
                                    </div>
                                }
                            })}
                        </div>
                    </div>
                    <div className="tweet">{this.state.tweet}</div>
                </div>
            </div>
        );
    }
}
