package com.yat2.episode.job;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import com.yat2.episode.job.dto.JobSummary;
import com.yat2.episode.job.dto.JobsByOccupationRes;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;

    @Cacheable("occupationsWithJobs")
    @Transactional(readOnly = true)
    public List<JobsByOccupationRes> getOccupationsWithJobs() {
        List<Job> jobs = jobRepository.findAllWithOccupation();
        if (jobs.isEmpty()) return List.of();

        List<JobsByOccupationRes> res = new ArrayList<>();
        Integer curOccId = null;
        String curOccName = null;
        List<JobSummary> curJobs = null;

        for (Job j : jobs) {
            Occupation o = j.getOccupation();

            if (!Objects.equals(curOccId, o.getId())) {
                if (curOccId != null) {
                    res.add(new JobsByOccupationRes(curOccId, curOccName, curJobs));
                }
                curOccId = o.getId();
                curOccName = o.getName();
                curJobs = new ArrayList<>();
            }

            curJobs.add(JobSummary.of(j));
        }

        res.add(new JobsByOccupationRes(curOccId, curOccName, curJobs));
        return res;
    }
}
