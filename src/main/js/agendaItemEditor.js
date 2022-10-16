import React from 'react';
import ReactDOM from 'react-dom';
import when from 'when';

import client from './client';
import follow from './follow';

const agendaId = window.location.pathname.split("-")[1];
const root = '/api';

export default class AgendaItemEditor extends React.Component {

    constructor(props) {
        super(props);
        this.state = {agenda: [], agendaItems: [], attributes: []};
        this.onCreate = this.onCreate.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
        this.onDelete = this.onDelete.bind(this);
    }

    componentDidMount() {
        this.loadFromServer(this.state.pageSize);
    }

    loadFromServer() {
        follow(client, root, ['agendaItems']).then(agendaItemList => {
            return client({
                method: 'GET',
                path: agendaItemList.entity._links.profile.href,
                headers: {'Accept': 'application/schema+json'}
            }).then(schema => {
                delete schema.entity.properties.agenda;
                this.schema = schema.entity;
            });
        }).then(response => {
            return client({
                method: 'GET',
                path: root + '/agendas/' + agendaId,
            });
        }).then(agenda => {
            this.agenda = agenda;
            return client({
                method: 'GET',
                path: agenda.entity._links.agendaItemList.href,
            });
        }).then(agendaItemList => {
            return agendaItemList.entity._embedded.agendaItems.map(agendaItem =>
                client({
                    method: 'GET',
                    path: agendaItem._links.self.href
                })
            );
        }).then(agendaItemPromises => { // <4>
            return when.all(agendaItemPromises);
        }).done(agendaItems => { // <5>
            this.setState({
                agenda: this.agenda,
                agendaItems: agendaItems,
                attributes: Object.keys(this.schema.properties),
            });
        });
    }

    onCreate(newAgendaItem, agenda) {
        follow(client, root, ['agendaItems']).then(agendaItemList => {
            newAgendaItem.agenda = agenda.entity._links.self.href;
            return client({
                method: 'POST',
                path: agendaItemList.entity._links.self.href,
                entity: newAgendaItem,
                headers: {'Content-Type': 'application/json'}
            });
        }).then(response => {
            return follow(client, root, ['agendaItems']);
        }).done(response => {
            this.loadFromServer()
        });
    }

    onUpdate(agendaItem, updatedAgendaItem) {
        client({
            method: 'PUT',
            path: agendaItem.entity._links.self.href,
            entity: updatedAgendaItem,
            headers: {
                'Content-Type': 'application/json',
                'If-Match': agendaItem.headers.Etag
            }
        }).done(response => {
            this.loadFromServer();
        }, response => {
            if (response.status.code === 412) {
                alert('DENIED: Unable to update ' +
                    agendaItem.entity._links.self.href + '. Your copy is stale.');
            }
        });
    }

    onDelete(agendaItem) {
        client({method: 'DELETE', path: agendaItem.entity._links.self.href}).done(response => {
            this.loadFromServer();
        });
    }

    render() {
        return (
            <div>
                <div>{this.state.agenda.name}</div>
                <div>
                    <a href={"/"}>Back to Agenda list</a>
                </div>
                <AgendaItemList agenda={this.state.agenda}
                            agendaItems={this.state.agendaItems}
                            attributes={this.state.attributes}
                            onCreate={this.onCreate}
                            onUpdate={this.onUpdate}
                            onDelete={this.onDelete}/>
                <div>
                    <a href={"/"}>Back to Agenda list</a>
                </div>
            </div>
        );
    }
}

class AgendaItemList extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        var agendaItems = this.props.agendaItems.map(agendaItem =>
                <AgendaItem key={agendaItem.entity._links.self.href}
                        agendaItem={agendaItem}
                        attributes={this.props.attributes}
                        onUpdate={this.props.onUpdate}
                        onDelete={this.props.onDelete}/>
        );


        return (
            <div>
                <table>
                    <thead>
                        <tr>
                            <th>Phase</th>
                            <th>
                                <CreateDialog agenda={this.props.agenda} attributes={this.props.attributes} onCreate={this.props.onCreate}/></th>
                        </tr>
                    </thead>
                    <tbody>
                        {agendaItems}
                        <tr>
                            <td colSpan={2}>TODO
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

class AgendaItem extends React.Component {

    constructor(props) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete() {
        this.props.onDelete(this.props.agendaItem);
    }

    render() {
        const dialogId = "deleteAgendaItem-" + this.props.agendaItem.entity._links.self.href;
        return (
            <tr>
                <td>{this.props.agendaItem.entity.phase}</td>
                <td>
                    <UpdateDialog agendaItem={this.props.agendaItem}
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
        const newAgendaItem = {};
        this.props.attributes.forEach(attribute => {
            newAgendaItem[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onCreate(newAgendaItem, this.props.agenda);

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
                <input type="text" placeholder={attribute} ref={attribute} className="field"/>
            </p>
        );

        return (
            <div>
                <a href="#createAgendaItem">Create a new agenda item</a>

                <div id="createAgendaItem" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Create a new agenda item</h2>

                        <form>
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
        const updatedAgendaItem = {};
        this.props.attributes.forEach(attribute => {
            updatedAgendaItem[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onUpdate(this.props.agendaItem, updatedAgendaItem);
        window.location = "#";
    }

    render() {
        const inputs = this.props.attributes.map(attribute =>
            <p key={this.props.agendaItem.entity[attribute]}>
                <input type="text" placeholder={attribute}
                       defaultValue={this.props.agendaItem.entity[attribute]}
                       ref={attribute} className="field"/>
            </p>
        );

        const dialogId = "updateAgendaItem-" + this.props.agendaItem.entity._links.self.href;

        return (
            <div key={this.props.agendaItem.entity._links.self.href}>
                <a href={"#" + dialogId}>Update</a>
                <div id={dialogId} className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Update an agenda item</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Update</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

};

