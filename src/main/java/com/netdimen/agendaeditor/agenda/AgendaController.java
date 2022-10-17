package com.netdimen.agendaeditor.agenda;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AgendaController {

    private AgendaRepository agendaRepository;

    public AgendaController(AgendaRepository agendaRepository) {

        this.agendaRepository = agendaRepository;
    }

    @GetMapping({"/","/agenda-{id}","/transaction"})
    public String index() {

        return "index";
    }

}
