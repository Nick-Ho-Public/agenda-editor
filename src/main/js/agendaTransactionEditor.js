import React from 'react';
import ReactDOM from 'react-dom';

import client from './client';
import follow from './follow';

const root = '/api';

export default class AgendaTransactionEditor extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            agendaName: "",
            agenda: null,
            agendaItemID: 1,
            agendaItems: [],
            attributes: [],
            phases: [],
        };
        this.onCreate = this.onCreate.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.saveTransaction = this.saveTransaction.bind(this);
        this.loadFromServer = this.loadFromServer.bind(this);
        this.serializeAgendaItem = this.serializeAgendaItem.bind(this);
    }

    componentDidMount() {
        this.loadFromServer();
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
        }).done(agendaItems => {
            this.setState({
                attributes: Object.keys(this.schema.properties),
                phases: this.schema.properties.phase.enum,
            });
        });
    }

    serializeAgendaItem(agendaItem) {
        this.state.attributes.forEach(attribute => {
            if (attribute === "itemOrder" || attribute === "duration") {
                agendaItem[attribute] = parseInt(agendaItem[attribute])
            } else if (attribute === "creditable") {
                agendaItem[attribute] = new Boolean(agendaItem[attribute] === "true")
            }
        })
        return agendaItem;
    }

    onCreate(newAgendaItem) {
        newAgendaItem = this.serializeAgendaItem(newAgendaItem);
        newAgendaItem = {
            "entity": Object.assign(
                {},
                newAgendaItem,
                {"_links": {
                    "self": {
                        "href": this.state.agendaItemID,
                    }
                }})
        };
        this.setState({
            agendaItems: [...this.state.agendaItems, newAgendaItem],
            agendaItemID: this.state.agendaItemID + 1,
        });
    }

    onUpdate(idx, updatedAgendaItem) {
        updatedAgendaItem = this.serializeAgendaItem(updatedAgendaItem);
        updatedAgendaItem = {
            "entity": Object.assign(
                {},
                updatedAgendaItem,
                {"_links": {
                        "self": {
                            "href": this.state.agendaItems[idx].entity._links.self.href,
                        }
                    }})
        };
        this.setState({
            agendaItems: [...this.state.agendaItems.slice(0,idx), updatedAgendaItem, ...this.state.agendaItems.slice(idx+1)],
        });
    }

    onDelete(idx) {
        this.setState({
            agendaItems: [...this.state.agendaItems.slice(0,idx), ...this.state.agendaItems.slice(idx+1)],
        });
    }

    saveTransaction() {
        var agendaItems = [];
        this.state.agendaItems.forEach(agendaItem => {
            delete agendaItem.entity._links;
            agendaItems.push(agendaItem.entity);
        });
        follow(client, root, ['agendas']).then(agendaList => {
            return client({
                method: 'POST',
                path: agendaList.entity._links.self.href,
                entity: {
                    "name": this.state.agendaName,
                    "agendaItems": agendaItems,
                },
                headers: {'Content-Type': 'application/json'}
            });
        }).done(response => {
            window.location = "/";
        }, response => {
            alert('Failed to create. Check the data and try again.');
        });
    }

    render() {
        var durationText;
        var creditableText;
        var warningText = "";
        var duration = 0;
        var creditable = 0;
        this.state.agendaItems.map(agendaitem => {
            duration = duration + agendaitem.entity.duration;
            if (agendaitem.entity.creditable) {
                creditable = creditable + agendaitem.entity.duration;
            }
        });
        if (Math.floor(duration/60) >= 1) {
            durationText = Math.floor(duration/60) + " hr " + duration % 60 + " min"
        } else {
            durationText = duration + " min";
        };
        if (Math.floor(creditable/60) >= 1) {
            creditableText = Math.floor(creditable/60) + " hr " + creditable % 60 + " min"
        } else {
            creditableText = creditable + " min";
            if (creditable < 15) {
                warningText = "(Attention: < 15 min!)"
            }
        };
        return (
            <div>
                Name:
                <input type="text"
                       placeholder={"name"}
                       ref={"agendaName"}
                       maxLength={255}
                       value={this.state.agendaName}
                       onChange={(e) =>
                           this.setState({agendaName: e.target.value})
                        }
                />
                <CreateDialog agenda={this.state.agenda}
                              attributes={this.state.attributes}
                              phases={this.state.phases}
                              onCreate={this.onCreate}/>
                <AgendaItemList agenda={this.state.agenda}
                            agendaItems={this.state.agendaItems}
                            attributes={this.state.attributes}
                            phases={this.state.phases}
                            onUpdate={this.onUpdate}
                            onDelete={this.onDelete}/>
                <div>
                    {"Total Duration: " + durationText}
                </div>
                <div>
                    {"Total Creditable Minutes: " + creditableText}
                </div>
                <div className={"warning"}>{warningText}</div>

                <button className="pure-button pure-button-primary" onClick={this.saveTransaction}>Save</button>

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
        var row;

        var agendaItems = this.props.agendaItems.map(agendaItem => {
            const dialogId = "updateAgendaItem-" + agendaItem.entity._links.self.href;
            return(
                <tr key={agendaItem.entity._links.self.href}
                    className={"draggable"}
                    draggable={true}
                    onDragStart={e => {
                        row = e.target;
                    }}
                    onDragOver={e => {
                        e.preventDefault();

                        let children = Array.from(e.target.parentNode.parentNode.children);
                        if (e.target.tagName === "A" || row.tagName === "A") return;
                        if (children.indexOf(e.target.parentNode) > children.indexOf(row)) {
                            e.target.parentNode.after(row);
                        } else {
                            e.target.parentNode.before(row);
                        }
                    }}>
                    <td>
                        <a draggable={false} href={"#" + dialogId}>
                            {agendaItem.entity.itemOrder}</a>
                    </td>
                    <td>{agendaItem.entity.phase}</td>
                    <td>{agendaItem.entity.content}</td>
                    <td>{agendaItem.entity.objectives}</td>
                    <td>{agendaItem.entity.duration} min</td>
                    <td>{agendaItem.entity.creditable == true ? "Yes" : ""}</td>
                </tr>
            )
            }
        );

        var updateDialogs = this.props.agendaItems.map((agendaItem, idx) =>
            <UpdateDialog key={agendaItem.entity._links.self.href}
                          agendaItem={agendaItem}
                          idx={idx}
                        attributes={this.props.attributes}
                        phases={this.props.phases}
                        onUpdate={this.props.onUpdate}
                        onDelete={this.props.onDelete}/>
        );

        return (
            <div style={{"overflowX":"auto"}}>
                <table className="pure-table">
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
                {updateDialogs}
            </div>
        );
    }
}

class CreateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            creditable: false,
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.clearDialog = this.clearDialog.bind(this);
    }

    handleSubmit(e) {
        if (this.refs.form.reportValidity()) {
            e.preventDefault();
            const newAgendaItem = {};
            this.props.attributes.forEach(attribute => {
                newAgendaItem[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
            });
            this.props.onCreate(newAgendaItem, this.props.agenda);

            this.clearDialog()

            // Navigate away from the dialog to hide it.
            window.location = "#";
        }
    }

    clearDialog() {
        this.props.attributes.forEach(attribute => {
            ReactDOM.findDOMNode(this.refs[attribute]).value = '';
        });
        this.setState({
            creditable: false,
        });
        ReactDOM.findDOMNode(this.refs["phase"]).value = "Welcome";
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
                                    required={attribute==='content'? this.state.creditable : false}
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
                                       checked={this.state.creditable}
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

        return (
            <div>
                <a href="#createAgendaItem">Create</a>

                <div id="createAgendaItem" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Create a new agenda item</h2>

                        <form ref={"form"} className="pure-form">
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
            creditable: this.props.agendaItem.entity.creditable == true,
        };
        this.handleDelete = this.handleDelete.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleDelete(e) {
        e.preventDefault();
        this.props.onDelete(this.props.idx);
        window.location = "#";
    }

    handleSubmit(e) {
        if (this.refs.form.reportValidity()) {
            e.preventDefault();
            const updatedAgendaItem = {};
            this.props.attributes.forEach(attribute => {
                updatedAgendaItem[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
            });
            this.props.onUpdate(this.props.idx, updatedAgendaItem);
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
                                    required={attribute==='content'? this.state.creditable : false}
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
                                       defaultChecked={this.props.agendaItem.entity[attribute] == true}
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

                        <form ref={"form"} className="pure-form">
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

