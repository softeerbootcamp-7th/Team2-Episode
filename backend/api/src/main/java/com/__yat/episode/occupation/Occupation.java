package com.__yat.episode.occupation;

import com.__yat.episode.job.Job;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "occupation")
public class Occupation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false, length = 15)
    private String name;

    @OneToMany(mappedBy = "occupation")
    private List<Job> jobs;

    // Getters & Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<Job> getJobs() { return jobs; }
    public void setJobs(List<Job> jobs) { this.jobs = jobs; }
}
