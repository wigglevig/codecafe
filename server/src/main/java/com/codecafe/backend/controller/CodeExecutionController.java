package com.codecafe.backend.controller;

import com.codecafe.backend.dto.CodeExecutionRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api")
public class CodeExecutionController {
    private final RestTemplate restTemplate;

    @Autowired
    public CodeExecutionController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostMapping("/execute")
    public String executeCode(@RequestBody CodeExecutionRequest request) {
        String pistonApiUrl = "https://emkc.org/api/v2/piston/execute";
        System.out.println(request);
        try {
            return restTemplate.postForObject(pistonApiUrl, request, String.class);
        } catch (Exception e) {
            e.printStackTrace(); 
            return "Error: " + e.getMessage();
        }
    }


}
