package com.netdimen.agendaeditor.agenda;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.netdimen.agendaeditor.agenda.Agenda;
import lombok.Data;

import javax.persistence.*;
import java.util.Objects;

@Data
@Entity
@Table(name = "agendaitem")
public class AgendaItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne
    private Agenda agenda;

    private @Version @JsonIgnore Long version;

    private int itemOrder;

    private String phase;

    private String content;

    private String objectives;

    private Long duration;

    private boolean creditable;

    private AgendaItem() {

    }

    public AgendaItem(int itemOrder, String phase, String content, String objectives, Long duration, boolean creditable, Agenda agenda) {
        this.itemOrder = itemOrder;
        this.phase = phase;
        this.content = content;
        this.objectives = objectives;
        this.duration = duration;
        this.creditable = creditable;
        this.agenda = agenda;
    }

    @Override
    public int hashCode() {
        return Objects.hash(getId());
    }
}
