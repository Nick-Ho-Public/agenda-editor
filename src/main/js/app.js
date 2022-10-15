import React from 'react';
import ReactDOM from 'react-dom';

import AgendaEditor from './agendaEditor';
import AgendaItemEditor from './agendaItemEditor';

class App extends React.Component {

    render() {
        var editor = window.location.pathname === "/" ? <AgendaEditor/> : <AgendaItemEditor/>;
        return(
            <div>
                <h1>Agenda Editor</h1>
                {editor}
            </div>
        );
    }

}

ReactDOM.render( <App /> , document.getElementById('root'));

