-- ==============================================================================
-- CodeEase: Initial Database Schema, RLS Policies, Functions, & Seed Data
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS daily_activity CASCADE;
DROP TABLE IF EXISTS xp_events CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS code_submissions CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS user_level_progress CASCADE;
DROP TABLE IF EXISTS user_course_progress CASCADE;
DROP TABLE IF EXISTS question_answers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS levels CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Profiles table (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    streak_count INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    programming_language TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    thumbnail_url TEXT,
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Levels table
CREATE TABLE levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL CHECK (level_number > 0),
    title TEXT NOT NULL,
    description TEXT,
    lesson_content TEXT NOT NULL,
    starter_code TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'beginner',
    passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_course_level UNIQUE (course_id, level_number)
);

-- 6. Questions table (Learner facing - NO answers)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB NOT NULL,
    points INTEGER DEFAULT 10 CHECK (points > 0),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Question Answers table (Protected - NO learner access)
CREATE TABLE question_answers (
    question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    correct_answer TEXT NOT NULL
);

-- 8. User Course Progress
CREATE TABLE user_course_progress (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed_levels INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)
);

-- 9. User Level Progress
CREATE TABLE user_level_progress (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
    best_score INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, level_id)
);

-- 10. Quiz Attempts
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Code Submissions
CREATE TABLE code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    programming_language TEXT NOT NULL,
    source_code TEXT NOT NULL,
    execution_status TEXT NOT NULL,
    output TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Certificates
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    final_score INTEGER NOT NULL,
    verification_status TEXT DEFAULT 'valid' CHECK (verification_status IN ('valid', 'revoked')),
    CONSTRAINT unique_user_course_certificate UNIQUE (user_id, course_id)
);

-- 13. XP Events (Prevent duplicate XP awards)
CREATE TABLE xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    xp INTEGER NOT NULL CHECK (xp >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_source_xp UNIQUE (user_id, source_type, source_id)
);

-- 14. Daily Activity (Streak & activity tracking)
CREATE TABLE daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_date)
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX idx_levels_course_id ON levels(course_id);
CREATE INDEX idx_levels_level_number ON levels(course_id, level_number);
CREATE INDEX idx_questions_level_id ON questions(level_id);
CREATE INDEX idx_user_level_progress_user ON user_level_progress(user_id);
CREATE INDEX idx_user_course_progress_user ON user_course_progress(user_id);
CREATE INDEX idx_quiz_attempts_user_level ON quiz_attempts(user_id, level_id);
CREATE INDEX idx_code_submissions_user ON code_submissions(user_id);
CREATE INDEX idx_certificates_cert_number ON certificates(certificate_number);
CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can read public profile data (safe fields), update only their own
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Courses: Publicly readable when published
CREATE POLICY "Courses are viewable by everyone" 
    ON courses FOR SELECT USING (published = true);

-- 3. Levels: Publicly readable when published
CREATE POLICY "Levels are viewable by everyone" 
    ON levels FOR SELECT USING (published = true);

-- 4. Questions: Learners can read questions of published levels
CREATE POLICY "Questions are viewable by everyone" 
    ON questions FOR SELECT USING (
        EXISTS (SELECT 1 FROM levels WHERE levels.id = questions.level_id AND levels.published = true)
    );

-- 5. Question Answers: NO learner access! Deny all to authenticated/anon; service_role bypasses RLS
-- Explicitly no policies created for question_answers -> defaults to deny all for client roles!

-- 6. User Course Progress: Users can only select their own
CREATE POLICY "Users can view their own course progress" 
    ON user_course_progress FOR SELECT USING (auth.uid() = user_id);

-- 7. User Level Progress: Users can only select their own
CREATE POLICY "Users can view their own level progress" 
    ON user_level_progress FOR SELECT USING (auth.uid() = user_id);

-- 8. Quiz Attempts: Users can only select their own
CREATE POLICY "Users can view their own quiz attempts" 
    ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);

-- 9. Code Submissions: Users can view and insert only their own
CREATE POLICY "Users can view their own code submissions" 
    ON code_submissions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own code submissions" 
    ON code_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Certificates: Users can view their own
CREATE POLICY "Users can view their own certificates" 
    ON certificates FOR SELECT USING (auth.uid() = user_id);

-- 11. XP Events: Users can view their own
CREATE POLICY "Users can view their own XP events" 
    ON xp_events FOR SELECT USING (auth.uid() = user_id);

-- 12. Daily Activity: Users can view their own
CREATE POLICY "Users can view their own daily activity" 
    ON daily_activity FOR SELECT USING (auth.uid() = user_id);

-- ==============================================================================
-- DATABASE TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Trigger: Automatically create profile on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Public Certificate Verification (safe minimal view)
CREATE OR REPLACE FUNCTION public.verify_certificate(p_certificate_number TEXT)
RETURNS TABLE (
    certificate_number TEXT,
    course_title TEXT,
    programming_language TEXT,
    learner_name TEXT,
    issued_at TIMESTAMPTZ,
    final_score INTEGER,
    verification_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.certificate_number,
        co.title AS course_title,
        co.programming_language,
        p.full_name AS learner_name,
        c.issued_at,
        c.final_score,
        c.verification_status
    FROM certificates c
    JOIN courses co ON co.id = c.course_id
    JOIN profiles p ON p.id = c.user_id
    WHERE c.certificate_number = p_certificate_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Submit Quiz Attempt & Grade Atomic Transaction (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_user_id UUID,
    p_level_id UUID,
    p_answers JSONB -- format: [{"question_id": "...", "answer": "..."}]
)
RETURNS JSONB AS $$
DECLARE
    v_level RECORD;
    v_total_questions INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_score_percentage INTEGER := 0;
    v_passed BOOLEAN := false;
    v_answer_record RECORD;
    v_user_answer TEXT;
    v_correct_answer TEXT;
    v_explanation TEXT;
    v_question_text TEXT;
    v_xp_to_award INTEGER := 0;
    v_results JSONB := '[]'::JSONB;
    v_next_level_id UUID;
    v_next_level_number INTEGER;
    v_all_completed BOOLEAN := false;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 1. Fetch level details
    SELECT id, course_id, level_number, passing_score INTO v_level
    FROM levels
    WHERE id = p_level_id AND published = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Level not found or not published';
    END IF;

    -- 2. Verify level is unlocked for the user (Level 1 is always unlocked)
    IF v_level.level_number > 1 THEN
        PERFORM 1 FROM user_level_progress
        WHERE user_id = p_user_id AND level_id = p_level_id AND status IN ('unlocked', 'in_progress', 'completed');
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'This level is locked. Complete previous levels first.';
        END IF;
    END IF;

    -- 3. Grade questions
    FOR v_answer_record IN 
        SELECT q.id AS q_id, q.question_text, q.explanation, qa.correct_answer
        FROM questions q
        JOIN question_answers qa ON qa.question_id = q.id
        WHERE q.level_id = p_level_id
    LOOP
        v_total_questions := v_total_questions + 1;
        
        -- Extract learner answer from JSONB array
        SELECT (elem->>'answer') INTO v_user_answer
        FROM jsonb_array_elements(p_answers) AS elem
        WHERE (elem->>'question_id')::UUID = v_answer_record.q_id;

        IF v_user_answer IS NOT NULL AND LOWER(TRIM(v_user_answer)) = LOWER(TRIM(v_answer_record.correct_answer)) THEN
            v_correct_count := v_correct_count + 1;
            v_results := v_results || jsonb_build_object(
                'question_id', v_answer_record.q_id,
                'question_text', v_answer_record.question_text,
                'user_answer', v_user_answer,
                'is_correct', true,
                'explanation', v_answer_record.explanation
            );
        ELSE
            v_results := v_results || jsonb_build_object(
                'question_id', v_answer_record.q_id,
                'question_text', v_answer_record.question_text,
                'user_answer', COALESCE(v_user_answer, ''),
                'is_correct', false,
                'correct_answer', v_answer_record.correct_answer,
                'explanation', v_answer_record.explanation
            );
        END IF;
    END LOOP;

    IF v_total_questions = 0 THEN
        v_score_percentage := 100;
        v_passed := true;
    ELSE
        v_score_percentage := ROUND((v_correct_count::NUMERIC / v_total_questions::NUMERIC) * 100);
        v_passed := (v_score_percentage >= v_level.passing_score);
    END IF;

    -- 4. Record Quiz Attempt
    INSERT INTO quiz_attempts (user_id, level_id, score, total_questions, passed, submitted_at)
    VALUES (p_user_id, p_level_id, v_score_percentage, v_total_questions, v_passed, NOW());

    -- 5. Handle Level Progress & Rewards if passed
    IF v_passed THEN
        -- Mark level completed
        INSERT INTO user_level_progress (user_id, level_id, status, best_score, attempts, completed_at, updated_at)
        VALUES (p_user_id, p_level_id, 'completed', v_score_percentage, 1, NOW(), NOW())
        ON CONFLICT (user_id, level_id) DO UPDATE
        SET status = 'completed',
            best_score = GREATEST(user_level_progress.best_score, EXCLUDED.best_score),
            attempts = user_level_progress.attempts + 1,
            completed_at = COALESCE(user_level_progress.completed_at, NOW()),
            updated_at = NOW();

        -- Award XP (50 XP for passing level + 10 XP per correct question)
        v_xp_to_award := 50 + (v_correct_count * 10);
        
        -- Insert unique XP event (ON CONFLICT DO NOTHING prevents duplicate XP)
        INSERT INTO xp_events (user_id, source_type, source_id, xp, created_at)
        VALUES (p_user_id, 'level_quiz', p_level_id::TEXT, v_xp_to_award)
        ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

        -- Update Daily Activity
        INSERT INTO daily_activity (user_id, activity_date, xp_earned)
        VALUES (p_user_id, v_today, v_xp_to_award)
        ON CONFLICT (user_id, activity_date) DO UPDATE
        SET xp_earned = daily_activity.xp_earned + EXCLUDED.xp_earned;

        -- Unlock Level N + 1
        v_next_level_number := v_level.level_number + 1;
        SELECT id INTO v_next_level_id
        FROM levels
        WHERE course_id = v_level.course_id AND level_number = v_next_level_number AND published = true;

        IF v_next_level_id IS NOT NULL THEN
            INSERT INTO user_level_progress (user_id, level_id, status, best_score, attempts, updated_at)
            VALUES (p_user_id, v_next_level_id, 'unlocked', 0, 0, NOW())
            ON CONFLICT (user_id, level_id) DO NOTHING;
        END IF;

        -- Update User Course Progress
        INSERT INTO user_course_progress (user_id, course_id, completed_levels, current_level, total_xp, last_activity_at, updated_at)
        VALUES (p_user_id, v_level.course_id, 1, COALESCE(v_next_level_number, v_level.level_number), v_xp_to_award, NOW(), NOW())
        ON CONFLICT (user_id, course_id) DO UPDATE
        SET completed_levels = (
                SELECT COUNT(DISTINCT ulp.level_id)
                FROM user_level_progress ulp
                JOIN levels l ON l.id = ulp.level_id
                WHERE ulp.user_id = p_user_id AND l.course_id = v_level.course_id AND ulp.status = 'completed'
            ),
            current_level = GREATEST(user_course_progress.current_level, COALESCE(v_next_level_number, user_course_progress.current_level)),
            total_xp = (
                SELECT COALESCE(SUM(xp), 0)
                FROM xp_events
                WHERE user_id = p_user_id
            ),
            last_activity_at = NOW(),
            updated_at = NOW();

    ELSE
        -- Update attempt count without passing
        INSERT INTO user_level_progress (user_id, level_id, status, best_score, attempts, updated_at)
        VALUES (p_user_id, p_level_id, 'in_progress', v_score_percentage, 1, NOW())
        ON CONFLICT (user_id, level_id) DO UPDATE
        SET best_score = GREATEST(user_level_progress.best_score, EXCLUDED.best_score),
            attempts = user_level_progress.attempts + 1,
            updated_at = NOW();
    END IF;

    -- Return comprehensive result
    RETURN jsonb_build_object(
        'passed', v_passed,
        'score', v_score_percentage,
        'total_questions', v_total_questions,
        'correct_count', v_correct_count,
        'passing_score', v_level.passing_score,
        'xp_awarded', CASE WHEN v_passed THEN v_xp_to_award ELSE 0 END,
        'results', v_results,
        'next_level_id', v_next_level_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- SAMPLE SEED DATA
-- ==============================================================================
DO $$
DECLARE
    v_c1_id UUID := '11111111-1111-1111-1111-111111111111';
    v_c2_id UUID := '22222222-2222-2222-2222-222222222222';
    v_c3_id UUID := '33333333-3333-3333-3333-333333333333';
    
    v_l1_id UUID := '11111111-0000-0000-0000-000000000001';
    v_l2_id UUID := '11111111-0000-0000-0000-000000000002';
    v_l3_id UUID := '11111111-0000-0000-0000-000000000003';
    
    v_q1_id UUID := gen_random_uuid();
    v_q2_id UUID := gen_random_uuid();
    v_q3_id UUID := gen_random_uuid();
    v_q4_id UUID := gen_random_uuid();
BEGIN
    -- 1. Python Course
    INSERT INTO courses (id, title, description, programming_language, difficulty, thumbnail_url, published)
    VALUES (
        v_c1_id,
        'Python 3 Fundamentals: Zero to Hero',
        'Master core Python syntax, variables, conditional statements, lists, loops, and functions through hands-on coding and quizzes.',
        'python',
        'beginner',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- Level 1: Variables & Data Types
    INSERT INTO levels (id, course_id, level_number, title, description, lesson_content, starter_code, difficulty, passing_score, published)
    VALUES (
        v_l1_id,
        v_c1_id,
        1,
        'Variables, Types & String Formatting',
        'Learn how to assign variables, understand integers, floats, booleans, and strings in Python 3.',
        '# Level 1: Variables & Data Types in Python

In Python, a variable is created the moment you first assign a value to it. Python has dynamic typing, which means you do not need to declare variable types explicitly.

### Basic Data Types:
- **Integer (`int`)**: Whole numbers, e.g., `age = 25`
- **Float (`float`)**: Decimal numbers, e.g., `price = 19.99`
- **String (`str`)**: Text enclosed in quotes, e.g., `name = "Ada Lovelace"`
- **Boolean (`bool`)**: Either `True` or `False`

### String Formatting (f-strings):
Introduced in Python 3.6, formatted string literals are prefixed with `f` and use `{}` for placeholders:
```python
score = 98
username = "DevHero"
print(f"Player {username} scored {score} points!")
```

### Try It Yourself:
Write code that computes the area of a rectangle given length and width.',
        '# Compute rectangle area
length = 10
width = 5
area = length * width
print(f"Area: {area}")',
        'beginner',
        70,
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- Level 1 Questions
    INSERT INTO questions (id, level_id, question_text, question_type, options, points, explanation)
    VALUES 
    (
        v_q1_id,
        v_l1_id,
        'Which of the following is the correct syntax for an f-string in Python 3?',
        'multiple_choice',
        '["f\"Value is {x}\"", "\"Value is %x\"", "format(\"Value is {x}\")", "str(x + \"Value is\")"]'::JSONB,
        10,
        'f-strings prefix the string literal with an "f" and evaluate expressions enclosed in curly braces {}.'
    ),
    (
        v_q2_id,
        v_l1_id,
        'What is the data type of the expression `42 / 2` in Python 3?',
        'multiple_choice',
        '["float", "int", "double", "decimal"]'::JSONB,
        10,
        'In Python 3, standard division (/) always returns a float, even when the division is exact.'
    ) ON CONFLICT (id) DO NOTHING;

    -- Correct answers in question_answers
    INSERT INTO question_answers (question_id, correct_answer)
    VALUES 
    (v_q1_id, 'f"Value is {x}"'),
    (v_q2_id, 'float')
    ON CONFLICT (question_id) DO NOTHING;

    -- Level 2: Control Flow & Conditionals
    INSERT INTO levels (id, course_id, level_number, title, description, lesson_content, starter_code, difficulty, passing_score, published)
    VALUES (
        v_l2_id,
        v_c1_id,
        2,
        'Conditionals & Logic (if/elif/else)',
        'Control execution flow with boolean logic and decision branches.',
        '# Level 2: Conditional Statements

Conditional statements enable programs to make decisions based on logical conditions.

### Syntax:
```python
if temperature > 30:
    print("It is hot outside")
elif temperature > 20:
    print("Nice weather")
else:
    print("Bundle up!")
```

### Logical Operators:
- `and`: True if both conditions are met
- `or`: True if at least one condition is met
- `not`: Inverts the boolean truth value',
        'status_code = 200
if status_code == 200:
    print("OK - Success")
elif status_code == 404:
    print("Not Found")
else:
    print("Other status")',
        'beginner',
        70,
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- Level 2 Questions
    INSERT INTO questions (id, level_id, question_text, question_type, options, points, explanation)
    VALUES 
    (
        v_q3_id,
        v_l2_id,
        'What keyword is used in Python for else-if statements?',
        'multiple_choice',
        '["elif", "elseif", "else if", "when"]'::JSONB,
        10,
        'Python uses the concise "elif" keyword for chained conditional checks.'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO question_answers (question_id, correct_answer)
    VALUES (v_q3_id, 'elif') ON CONFLICT (question_id) DO NOTHING;

    -- Level 3: Loops & Functions
    INSERT INTO levels (id, course_id, level_number, title, description, lesson_content, starter_code, difficulty, passing_score, published)
    VALUES (
        v_l3_id,
        v_c1_id,
        3,
        'Loops, Iteration & Reusable Functions',
        'Master for-loops, while-loops, and write reusable modular functions with return values.',
        '# Level 3: Loops & Functions

### Functions
Functions are declared using the `def` keyword:
```python
def calculate_grade(score):
    if score >= 90:
        return "A"
    return "Pass"
```

### For Loops
```python
for i in range(1, 6):
    print(f"Step {i}")
```',
        'def fibonacci(n):
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print(fibonacci(7))',
        'beginner',
        70,
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- Level 3 Question
    INSERT INTO questions (id, level_id, question_text, question_type, options, points, explanation)
    VALUES 
    (
        v_q4_id,
        v_l3_id,
        'What does `range(1, 5)` generate when converted to a list in Python?',
        'multiple_choice',
        '["[1, 2, 3, 4]", "[1, 2, 3, 4, 5]", "[0, 1, 2, 3, 4]", "[2, 3, 4, 5]"]'::JSONB,
        10,
        'The stop parameter in range() is exclusive, so range(1, 5) produces numbers from 1 up to (but not including) 5.'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO question_answers (question_id, correct_answer)
    VALUES (v_q4_id, '[1, 2, 3, 4]') ON CONFLICT (question_id) DO NOTHING;

    -- 2. JavaScript Course
    INSERT INTO courses (id, title, description, programming_language, difficulty, thumbnail_url, published)
    VALUES (
        v_c2_id,
        'JavaScript ES6+ & Modern Web Engines',
        'Explore closures, array methods, async/await, promises, and modern ES module paradigms.',
        'javascript',
        'beginner',
        'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=600&q=80',
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. C Systems Programming Course
    INSERT INTO courses (id, title, description, programming_language, difficulty, thumbnail_url, published)
    VALUES (
        v_c3_id,
        'C Systems Programming & Memory Architecture',
        'Understand pointers, memory allocation, struct layouts, and low-level POSIX execution.',
        'c',
        'intermediate',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
        true
    ) ON CONFLICT (id) DO NOTHING;

END $$;
