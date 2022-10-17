import React from 'react';
import ReactDOM from 'react-dom';

import AgendaEditor from './agendaEditor';
import AgendaItemEditor from './agendaItemEditor';
import AgendaTransactionEditor from "./agendaTransactionEditor";

class App extends React.Component {

    render() {
        var editor;
        switch (window.location.pathname) {
            case "/":
                editor = <AgendaEditor/>
                break;
            case "/transaction":
                editor = <AgendaTransactionEditor/>
                break;
            default:
                editor = <AgendaItemEditor/>;
        }
        return(
            <div>
                <h1>Agenda Editor</h1>
                {editor}
            </div>
        );
    }

}

ReactDOM.render( <App /> , document.getElementById('root'));

