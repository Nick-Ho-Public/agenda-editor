package com.netdimen.agendaeditor.agenda;

import javax.persistence.AttributeConverter;
import javax.persistence.Converter;
import java.util.stream.Stream;

@Converter(autoApply = true)
public class PhaseConverter implements AttributeConverter<Phase, String> {

    @Override
    public String convertToDatabaseColumn(Phase phase) {
        if (phase == null) {
            return null;
        }
        return phase.getText();
    }

    @Override
    public Phase convertToEntityAttribute(String text) {
        if (text == null) {
            return null;
        }

        return Stream.of(Phase.values())
                .filter(c -> c.getText().equals(text))
                .findFirst()
                .orElseThrow(IllegalArgumentException::new);
    }
}
