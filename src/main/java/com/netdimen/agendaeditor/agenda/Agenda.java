package com.netdimen.agendaeditor.agenda;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Data
@Entity
@Table(name = "agenda")
public class Agenda {

    @Id
    @GeneratedValue
    private Long id;

    private @Version @JsonIgnore Long version;

    private String name;

    @OneToMany(mappedBy = "agenda", fetch = FetchType.EAGER, cascade = {CascadeType.REMOVE})
    @OrderBy("itemOrder")
    private List<AgendaItem> agendaItemList = new ArrayList<>();

    private Agenda() {

    }

    public Agenda(String name) {
        this.name = name;
    }

    @Override
    public int hashCode() {
        return Objects.hash(getId());
    }
}
