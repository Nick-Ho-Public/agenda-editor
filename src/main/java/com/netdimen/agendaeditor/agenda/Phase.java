package com.netdimen.agendaeditor.agenda;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Phase {
    WELCOME("Welcome"),
    DISCUSSION_ITEMS("Discussion Items"),
    BREAK("Break"),
    ACTION_ITEMS("Action Items"),
    CONCLUSION("Conclusion");

    private String text;

    Phase(String text) {
        this.text = text;
    }

    @JsonValue
    public String getText() {
        return text;
    }

}