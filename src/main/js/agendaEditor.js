import React from 'react';
import ReactDOM from 'react-dom';
import when from 'when';

import client from './client';
import follow from './follow';

const root = '/api';

export default class AgendaEditor extends React.Component {

    constructor(props) {
        super(props);
        this.state = {agendas: [], attributes: [], pageSize: 5, links: {}};
        this.updatePageSize = this.updatePageSize.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
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
                delete schema.entity.properties.agendaItemList;
                this.schema = schema.entity;
                this.links = agendaList.entity._links;
                return agendaList;
            });
        }).then(agendaList => { // <3>
            return agendaList.entity._embedded.agendas.map(agenda =>
                client({
                    method: 'GET',
                    path: agenda._links.self.href
                })
            );
        }).then(agendaPromises => { // <4>
            return when.all(agendaPromises);
        }).done(agendas => { // <5>
            this.setState({
                agendas: agendas,
                attributes: Object.keys(this.schema.properties),
                pageSize: pageSize,
                links: this.links
            });
        });
    }

    onNavigate(navUri) {
        client({method: 'GET', path: navUri}).then(agendaList => {
            this.links = agendaList.entity._links;

            return agendaList.entity._embedded.agendas.map(agenda =>
                client({
                    method: 'GET',
                    path: agenda._links.self.href
                })
            );
        }).then(agendaPromises => {
            return when.all(agendaPromises);
        }).done(agendas => {
            this.setState({
                agendas: agendas,
                attributes: Object.keys(this.schema.properties),
                pageSize: this.state.pageSize,
                links: this.links
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
                this.onNavigate(response.entity._links.self.href);
            }
        });
    }

    onUpdate(agenda, updatedAgenda) {
        client({
            method: 'PUT',
            path: agenda.entity._links.self.href,
            entity: updatedAgenda,
            headers: {
                'Content-Type': 'application/json',
                'If-Match': agenda.headers.Etag
            }
        }).done(response => {
            this.loadFromServer(this.state.pageSize);
        }, response => {
            if (response.status.code === 412) {
                alert('DENIED: Unable to update ' +
                    agenda.entity._links.self.href + '. Your copy is stale.');
            }
        });
    }

    onDelete(agenda) {
        client({method: 'DELETE', path: agenda.entity._links.self.href}).done(response => {
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
                <a href="transaction">Create Agenda with items in one single transaction</a>
                <AgendaList agendas={this.state.agendas}
                            links={this.state.links}
                            pageSize={this.state.pageSize}
                            attributes={this.state.attributes}
                            onNavigate={this.onNavigate}
                            onCreate={this.onCreate}
                            onUpdate={this.onUpdate}
                            onDelete={this.onDelete}
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
                <Agenda key={agenda.entity._links.self.href}
                        agenda={agenda}
                        attributes={this.props.attributes}
                        onUpdate={this.props.onUpdate}
                        onDelete={this.props.onDelete}/>
        );


        var navLeftLinks = [];
        var navRightLinks = [];
        if ("first" in this.props.links) {
            navLeftLinks.push(<button style={{"fontSize": "75%", "margin": "1px"}} className={"pure-button"} key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
        }
        if ("prev" in this.props.links) {
            navLeftLinks.push(<button style={{"fontSize": "75%", "margin": "1px"}} className={"pure-button"} key="prev" onClick={this.handleNavPrev}>&lt;</button>);
        }
        if ("next" in this.props.links) {
            navRightLinks.push(<button style={{"fontSize": "75%", "margin": "1px"}} className={"pure-button"} key="next" onClick={this.handleNavNext}>&gt;</button>);
        }
        if ("last" in this.props.links) {
            navRightLinks.push(<button style={{"fontSize": "75%", "margin": "1px"}} className={"pure-button"} key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
        }

        return (
            <div>
                <table className="pure-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>
                                <CreateDialog attributes={this.props.attributes} onCreate={this.props.onCreate}/></th>
                        </tr>
                    </thead>
                    <tbody>
                        {agendas}
                        <tr>
                            <td colSpan={2}>{navLeftLinks}
                                <select ref="pageSize" defaultValue={String(this.props.pageSize)} onChange ={this.handleInput}>
                                    <option value="1">1</option>
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                </select> agendas per page {navRightLinks}
                            </td>
                        </tr>
                    </tbody>
                </table>
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
        const dialogId = "deleteAgenda-" + this.props.agenda.entity._links.self.href;
        return (
            <tr>
                <td><a href={"agenda-"+this.props.agenda.entity._links.self.href.split("/").slice(-1)}>{this.props.agenda.entity.name}</a></td>
                <td>
                    <UpdateDialog agenda={this.props.agenda}
                                  attributes={this.props.attributes}
                                  onUpdate={this.props.onUpdate}/>
                    <div>
                        <a href={"#"+dialogId} onClick={this.handleDelete}>Delete</a>
                    </div>
                </td>
            </tr>
        );
    }
}

class CreateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        const newAgenda = {};
        this.props.attributes.forEach(attribute => {
            newAgenda[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onCreate(newAgenda);

        // clear out the dialog's inputs
        this.props.attributes.forEach(attribute => {
            ReactDOM.findDOMNode(this.refs[attribute]).value = '';
        });

        // Navigate away from the dialog to hide it.
        window.location = "#";
    }

    render() {
        const inputs = this.props.attributes.map(attribute =>
            <p key={attribute}>
                <input type="text" maxLength={255} placeholder={attribute} ref={attribute} className="field"/>
            </p>
        );

        return (
            <div>
                <a href="#createAgenda">Create</a>

                <div id="createAgenda" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Create a new agenda</h2>

                        <form className="pure-form">
                            {inputs}
                            <button onClick={this.handleSubmit}>Create</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

}

class UpdateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        const updatedAgenda = {};
        this.props.attributes.forEach(attribute => {
            updatedAgenda[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onUpdate(this.props.agenda, updatedAgenda);
        window.location = "#";
    }

    render() {
        const inputs = this.props.attributes.map(attribute =>
            <p key={this.props.agenda.entity[attribute]}>
                <input type="text" placeholder={attribute}
                       maxLength={255}
                       defaultValue={this.props.agenda.entity[attribute]}
                       ref={attribute} className="field"/>
            </p>
        );

        const dialogId = "updateAgenda-" + this.props.agenda.entity._links.self.href;

        return (
            <div key={this.props.agenda.entity._links.self.href}>
                <a href={"#" + dialogId}>Update</a>
                <div id={dialogId} className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Update an agenda</h2>

                        <form className="pure-form">
                            {inputs}
                            <button onClick={this.handleSubmit}>Update</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

};

