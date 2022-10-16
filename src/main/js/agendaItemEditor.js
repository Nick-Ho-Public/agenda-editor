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
        this.state = {
            agenda: [],
            agendaItems: [],
            attributes: [],
            phases: [],};
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
        }).then(agendaItemPromises => {
            return when.all(agendaItemPromises);
        }).done(agendaItems => {
            this.setState({
                agenda: this.agenda,
                agendaItems: agendaItems,
                attributes: Object.keys(this.schema.properties),
                phases: this.schema.properties.phase.enum,
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
                <CreateDialog agenda={this.state.agenda} attributes={this.state.attributes} onCreate={this.onCreate}/>
                <AgendaItemList agenda={this.state.agenda}
                            agendaItems={this.state.agendaItems}
                            attributes={this.state.attributes}
                            phases={this.state.phases}
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
                        phases={this.props.phases}
                        onUpdate={this.props.onUpdate}
                        onDelete={this.props.onDelete}/>
        );


        return (
            <div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Phase</th>
                            <th>Content</th>
                            <th>Objectives</th>
                            <th>Duration (min)</th>
                            <th>Creditable</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agendaItems}
                    </tbody>
                </table>
            </div>
        );
    }
}

class AgendaItem extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        const dialogId = "updateAgendaItem-" + this.props.agendaItem.entity._links.self.href;
        return (
            <tr>
                <td>
                    <a href={"#"+dialogId}>
                        {this.props.agendaItem.entity.itemOrder}</a>
                    <UpdateDialog agendaItem={this.props.agendaItem}
                                  attributes={this.props.attributes}
                                  phases={this.props.phases}
                                  onUpdate={this.props.onUpdate}
                                  onDelete={this.props.onDelete}/>
                </td>
                <td>{this.props.agendaItem.entity.phase}</td>
                <td>{this.props.agendaItem.entity.content}</td>
                <td>{this.props.agendaItem.entity.objectives}</td>
                <td>{this.props.agendaItem.entity.duration} min</td>
                <td>{this.props.agendaItem.entity.creditable?"Yes":""}</td>
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
        this.state = {
            creditable: this.props.agendaItem.entity.creditable,
        };
        this.handleDelete = this.handleDelete.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleDelete(e) {
        e.preventDefault();
        this.props.onDelete(this.props.agendaItem);
        window.location = "#";
    }

    handleSubmit(e) {
        if (this.refs.form.reportValidity()) {
            e.preventDefault();
            const updatedAgendaItem = {};
            this.props.attributes.forEach(attribute => {
                updatedAgendaItem[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
            });
            this.props.onUpdate(this.props.agendaItem, updatedAgendaItem);
            window.location = "#";
        }
    }

    render() {
        const phases = this.props.phases.map(phase =>
            <option value={phase} key={phase}>
                {phase}
            </option>
        )
        const attributes = ['itemOrder', 'phase', 'content', 'objectives', 'duration', 'creditable']
        const inputs = attributes.map(attribute =>
            <p key={attribute}>
                {(() => {
                    if (attribute==='itemOrder' || attribute==='duration') {
                        return (
                            <span>
                                {attribute==='itemOrder'? "Order:" : "Duration (min):"}
                                <input type="number"
                                       min={attribute==='itemOrder'?1:0}
                                       step={1}
                                       required={true}
                                       placeholder={attribute}
                                       defaultValue={this.props.agendaItem.entity[attribute]}
                                       ref={attribute}
                                       className="field"
                                />
                            </span>
                        )
                    } else if (attribute==='phase') {
                        return (
                            <span>
                                {"Phase:"}
                                <select required={true}
                                        defaultValue={this.props.agendaItem.entity[attribute]}
                                        ref={attribute}
                                        className="field">
                                    {phases}
                                </select>
                            </span>
                        )
                    } else if (attribute==='content' || attribute==='objectives') {
                        return (
                            <span>
                                {attribute==='content'? "Content:" : "Objectives:"}
                                <textarea
                                    placeholder={attribute}
                                    defaultValue={this.props.agendaItem.entity[attribute]}
                                    ref={attribute}
                                    className="field"
                                />
                            </span>
                        )
                    } else if (attribute==='creditable') {
                        return (
                            <label>
                                Creditable :
                                <input type="checkbox"
                                       defaultChecked={this.props.agendaItem.entity[attribute]}
                                       value={this.state.creditable}
                                       onClick={()=>this.setState({
                                               creditable: !this.state.creditable,
                                           }
                                       )}
                                       ref={attribute}
                                />
                            </label>
                        )
                    }})()}
            </p>
        );

        const dialogId = "updateAgendaItem-" + this.props.agendaItem.entity._links.self.href;

        return (
            <div key={this.props.agendaItem.entity._links.self.href}>
                <div id={dialogId} className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Update an agenda item</h2>

                        <form ref={"form"}>
                            {inputs}
                            <button onClick={this.handleSubmit}>Update</button>
                            <button onClick={this.handleDelete}>Delete</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

};

