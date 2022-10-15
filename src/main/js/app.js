import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, Link, Route} from 'react-router-dom';

import client from './client';
import follow from './follow';

const root = '/api';

class App extends React.Component {

    render() {
        return (
            <div>
                <h1>Agenda Editor</h1>
                <AgendaEditor/>
            </div>
        );
    }

}

class AgendaEditor extends React.Component {

    constructor(props) {
        super(props);
        this.state = {agendas: [], attributes: [], pageSize: 2, links: {}};
        this.updatePageSize = this.updatePageSize.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onNavigate = this.onNavigate.bind(this);
    }

    componentDidMount() {
        this.loadFromServer(this.state.pageSize);
    }

    loadFromServer(pageSize) {
        follow(client, root, [
            {rel: 'agendas', params: {size: pageSize}}]
        ).then(agendaList => {
            return client({
                method: 'GET',
                path: agendaList.entity._links.profile.href,
                headers: {'Accept': 'application/schema+json'}
            }).then(schema => {
                this.schema = schema.entity;
                return agendaList;
            });
        }).done(agendaList => {
            this.setState({
                agendas: agendaList.entity._embedded.agendas,
                attributes: Object.keys(this.schema.properties),
                pageSize: pageSize,
                links: agendaList.entity._links
            });
        });
    }

    onCreate(newAgenda) {
        follow(client, root, ['agendas']).then(agendaList => {
            return client({
                method: 'POST',
                path: agendaList.entity._links.self.href,
                entity: newAgenda,
                headers: {'Content-Type': 'application/json'}
            });
        }).then(response => {
            return follow(client, root, [
                {rel: 'agendas', params: {'size': this.state.pageSize}}]);
        }).done(response => {
            if (typeof response.entity._links.last !== "undefined") {
                this.onNavigate(response.entity._links.last.href);
            } else {
                this.onNavigate(response.entity._links.first.href);
            }
        });
    }

    onNavigate(navUri) {
        client({method: 'GET', path: navUri}).done(agendaList => {
            this.setState({
                agendas: agendaList.entity._embedded.agendas,
                attributes: this.state.attributes,
                pageSize: this.state.pageSize,
                links: agendaList.entity._links
            });
        });
    }

    onDelete(agenda) {
        client({method: 'DELETE', path: agenda._links.self.href}).done(response => {
            this.loadFromServer(this.state.pageSize);
        });
    }

    updatePageSize(pageSize) {
        if (pageSize !== this.state.pageSize) {
            this.loadFromServer(pageSize);
        }
    }

    render() {
        return (
            <div>
                <AgendaList agendas={this.state.agendas}
                            links={this.state.links}
                            pageSize={this.state.pageSize}
                            onNavigate={this.onNavigate}
                            onDelete={this.state.onDelete}
                            updatePageSize={this.updatePageSize}/>
            </div>
        );
    }
}

class AgendaList extends React.Component {

    constructor(props) {
        super(props);
        this.handleNavFirst = this.handleNavFirst.bind(this);
        this.handleNavPrev = this.handleNavPrev.bind(this);
        this.handleNavNext = this.handleNavNext.bind(this);
        this.handleNavLast = this.handleNavLast.bind(this);
        this.handleInput = this.handleInput.bind(this);
    }

    handleInput(e) {
        e.preventDefault();
        var pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
        if (/^[0-9]+$/.test(pageSize)) {
            this.props.updatePageSize(pageSize);
        } else {
            ReactDOM.findDOMNode(this.refs.pageSize).value =
                pageSize.substring(0, pageSize.length - 1);
        }
    }

    handleNavFirst(e){
        e.preventDefault();
        this.props.onNavigate(this.props.links.first.href);
    }

    handleNavPrev(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.prev.href);
    }

    handleNavNext(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.next.href);
    }

    handleNavLast(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.last.href);
    }

    render() {
        var agendas = this.props.agendas.map(agenda =>
                <Agenda key={agenda._links.self.href} agenda={agenda} onDelete={this.props.onDelete}/>
        );


        var navLinks = [];
        if ("first" in this.props.links) {
            navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
        }
        if ("prev" in this.props.links) {
            navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
        }
        if ("next" in this.props.links) {
            navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
        }
        if ("last" in this.props.links) {
            navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
        }

        return (
            <div>
                Page size: <input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agendas}
                    </tbody>
                </table>
                <div>
                    {navLinks}
                </div>
            </div>
        );
    }
}

class Agenda extends React.Component {

    constructor(props) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete() {
        this.props.onDelete(this.props.agenda);
    }

    render() {
        return (
            <tr>
                <td>{this.props.agenda.name}</td>
                <td>
                    <button onClick={this.handleDelete}>Delete</button>
                </td>
            </tr>
        );
    }
}

ReactDOM.render( <App /> , document.getElementById('root'));

