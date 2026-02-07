import { db } from "./db";
import { users, rfps, templates, responses, responseSections } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create sample users
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    const sampleUsers = [
      {
        username: "jdoe",
        password: "hashed_password",
        email: "jane.doe@company.com",
        fullName: "Jane Doe",
        role: "pm",
        title: "Proposal Manager",
        hourlyRate: "0",
      },
      {
        username: "ssmith",
        password: "hashed_password",
        email: "sarah.smith@company.com",
        fullName: "Sarah Smith",
        role: "consultant",
        title: "Principal",
        hourlyRate: "250",
      },
      {
        username: "mjohnson",
        password: "hashed_password",
        email: "mike.johnson@company.com",
        fullName: "Mike Johnson",
        role: "consultant",
        title: "Consultant",
        hourlyRate: "175",
      },
      {
        username: "ewilliams",
        password: "hashed_password",
        email: "emma.williams@company.com",
        fullName: "Emma Williams",
        role: "consultant",
        title: "Research Associate",
        hourlyRate: "125",
      },
      {
        username: "dthompson",
        password: "hashed_password",
        email: "david.thompson@company.com",
        fullName: "David Thompson",
        role: "copy_editor",
        title: "Senior Copy Editor",
        hourlyRate: "100",
      },
      {
        username: "rbrown",
        password: "hashed_password",
        email: "rachel.brown@company.com",
        fullName: "Rachel Brown",
        role: "managing_director",
        title: "Managing Director",
        hourlyRate: "350",
      },
    ];

    await db.insert(users).values(sampleUsers);
    console.log("Created sample users");
  }

  // Create sample templates
  const existingTemplates = await db.select().from(templates);
  if (existingTemplates.length === 0) {
    const sampleTemplates = [
      {
        name: "Executive Summary",
        description: "Standard executive summary template for government proposals",
        category: "Introduction",
        content: `[Company Name] is pleased to submit this proposal in response to the [RFP Title]. Our team brings over [X] years of experience in [relevant field] and a proven track record of successful project delivery.

Our approach combines industry best practices with innovative solutions tailored to your specific needs. We understand the critical importance of [key requirement] and have assembled a team of experts dedicated to ensuring project success.

Key Highlights:
- Proven methodology with demonstrated results
- Experienced team with relevant expertise
- Commitment to quality and timely delivery
- Cost-effective solutions that maximize value`,
      },
      {
        name: "Technical Approach",
        description: "Framework for describing technical methodology",
        category: "Technical",
        content: `Technical Approach Overview

Our technical approach is designed to address all requirements outlined in the RFP while ensuring quality, efficiency, and stakeholder satisfaction.

Methodology:
1. Discovery and Analysis
   - Comprehensive stakeholder interviews
   - Current state assessment
   - Requirements validation

2. Design and Planning
   - Solution architecture development
   - Detailed project plan creation
   - Risk mitigation strategy

3. Implementation
   - Phased rollout approach
   - Quality assurance checkpoints
   - Continuous communication

4. Knowledge Transfer and Support
   - Comprehensive documentation
   - Training programs
   - Ongoing support options`,
      },
      {
        name: "Management Approach",
        description: "Project management and team structure template",
        category: "Management",
        content: `Management Approach

Project Leadership:
[Project Manager Name] will serve as the primary point of contact and be responsible for overall project coordination and delivery.

Team Structure:
Our team structure ensures clear lines of communication and accountability:
- Project Manager: Overall project oversight
- Technical Lead: Technical direction and quality
- Subject Matter Experts: Domain-specific expertise
- Quality Assurance: Deliverable review and validation

Communication Plan:
- Weekly status meetings
- Monthly progress reports
- Immediate escalation procedures for critical issues

Risk Management:
We employ proactive risk identification and mitigation strategies throughout the project lifecycle.`,
      },
      {
        name: "Past Performance",
        description: "Template for showcasing relevant experience",
        category: "Qualifications",
        content: `Past Performance

[Company Name] has successfully completed numerous projects similar in scope and complexity to the requirements outlined in this RFP.

Project 1: [Project Name]
- Client: [Agency/Organization]
- Contract Value: $[Amount]
- Period of Performance: [Dates]
- Key Accomplishments: [Brief description of outcomes]
- Reference: [Name, Title, Contact Information]

Project 2: [Project Name]
- Client: [Agency/Organization]
- Contract Value: $[Amount]
- Period of Performance: [Dates]
- Key Accomplishments: [Brief description of outcomes]
- Reference: [Name, Title, Contact Information]

All projects were completed on time, within budget, and received positive performance evaluations.`,
      },
    ];

    await db.insert(templates).values(sampleTemplates);
    console.log("Created sample templates");
  }

  // Create sample RFPs
  const existingRfps = await db.select().from(rfps);
  if (existingRfps.length === 0) {
    const sampleRfps = [
      {
        title: "IT Infrastructure Modernization Services",
        source: "federal",
        agency: "Department of Health and Human Services",
        status: "in_progress",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        keywords: ["IT", "infrastructure", "modernization", "cloud"],
        documentContent: `REQUEST FOR PROPOSALS
IT Infrastructure Modernization Services
Department of Health and Human Services

1. INTRODUCTION
The Department of Health and Human Services (HHS) is seeking proposals from qualified vendors to modernize its IT infrastructure.

2. SCOPE OF WORK
2.1 The contractor shall assess the current IT infrastructure and develop a comprehensive modernization plan.
2.2 The contractor shall implement cloud-based solutions to improve efficiency and reduce costs.
2.3 The contractor shall provide training to HHS staff on new systems.

3. REQUIREMENTS
3.1 Technical Requirements
- Cloud migration expertise required
- Experience with federal security standards (FedRAMP)
- Demonstrated ability to scale solutions

3.2 Contractor Qualifications
- Minimum 5 years experience in federal IT contracts
- CMMI Level 3 or higher certification
- ISO 27001 certification preferred

4. DELIVERABLES
4.1 Infrastructure Assessment Report (Month 2)
4.2 Modernization Plan (Month 3)
4.3 Cloud Migration (Months 4-8)
4.4 Training Documentation (Month 9)
4.5 Final Report (Month 10)

5. BUDGET
The total budget for this project shall not exceed $5,000,000 over 3 years.

6. PROPOSAL SUBMISSION
Proposals must be submitted by the due date listed in this RFP.`,
      },
      {
        title: "Public Health Data Analytics Platform",
        source: "state",
        agency: "California Department of Public Health",
        state: "California",
        status: "draft",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        keywords: ["healthcare", "analytics", "data", "public health"],
        documentContent: `California Department of Public Health
Request for Proposals: Public Health Data Analytics Platform

Purpose:
The California Department of Public Health seeks a qualified vendor to develop and implement a comprehensive data analytics platform for public health surveillance and decision support.

Key Requirements:
1. Real-time data integration from multiple sources
2. Advanced analytics and visualization capabilities
3. HIPAA-compliant data handling
4. Scalable architecture to handle growing data volumes
5. User-friendly interface for non-technical users

Budget: $2,500,000 over 2 years

Submission Deadline: See cover page`,
      },
      {
        title: "Workforce Development Program Evaluation",
        source: "federal",
        agency: "Department of Labor",
        status: "review",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        keywords: ["workforce", "evaluation", "training", "employment"],
        documentContent: `Department of Labor
Workforce Development Program Evaluation RFP

Background:
The Department of Labor requires a comprehensive evaluation of its workforce development programs to assess effectiveness and identify improvements.

Scope:
- Evaluation of 5 major workforce programs
- Analysis of participant outcomes
- Recommendations for program improvement
- Cost-benefit analysis

Requirements:
- Experience with federal program evaluation
- Expertise in workforce development
- Strong research methodology capabilities`,
      },
    ];

    for (const rfp of sampleRfps) {
      await db.insert(rfps).values(rfp);
    }
    console.log("Created sample RFPs");
  }

  // Create sample responses with sections assigned to consultants
  const existingResponses = await db.select().from(responses);
  if (existingResponses.length === 0) {
    const seededUsers = await db.select().from(users);
    const seededRfps = await db.select().from(rfps);
    
    if (seededUsers.length > 0 && seededRfps.length > 0) {
      const sarahSmith = seededUsers.find(u => u.username === "ssmith");
      const mikeJohnson = seededUsers.find(u => u.username === "mjohnson");
      const emmaWilliams = seededUsers.find(u => u.username === "ewilliams");
      
      const itRfp = seededRfps.find(r => r.title.includes("IT Infrastructure"));
      const healthRfp = seededRfps.find(r => r.title.includes("Public Health"));
      
      if (itRfp && sarahSmith && mikeJohnson) {
        const [response1] = await db.insert(responses).values({
          rfpId: itRfp.id,
          content: "",
        }).returning();
        
        await db.insert(responseSections).values([
          {
            responseId: response1.id,
            title: "Executive Summary",
            content: "Our firm is uniquely qualified to deliver this IT infrastructure modernization project...",
            orderIndex: 0,
            assignedUserId: sarahSmith.id,
            isLocked: false,
          },
          {
            responseId: response1.id,
            title: "Technical Approach",
            content: "We will employ a phased approach to cloud migration following industry best practices...",
            orderIndex: 1,
            assignedUserId: mikeJohnson.id,
            isLocked: false,
          },
        ]);
      }
      
      if (healthRfp && emmaWilliams) {
        const [response2] = await db.insert(responses).values({
          rfpId: healthRfp.id,
          content: "",
        }).returning();
        
        await db.insert(responseSections).values([
          {
            responseId: response2.id,
            title: "Data Integration Strategy",
            content: "Our approach to real-time data integration leverages modern streaming architectures...",
            orderIndex: 0,
            assignedUserId: emmaWilliams.id,
            isLocked: false,
          },
        ]);
      }
      
      console.log("Created sample responses with consultant assignments");
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
