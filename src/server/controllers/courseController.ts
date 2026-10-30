import { Request, Response, NextFunction } from 'express';
import { listCourses, getCourseDetails, getLevelDetails } from '../services/courseService.ts';

export const getCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const courses = await listCourses(req.user?.id);
    res.json({ courses });
  } catch (err) {
    next(err);
  }
};

export const getCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const courseData = await getCourseDetails(courseId, req.user?.id);
    res.json(courseData);
  } catch (err) {
    next(err);
  }
};

export const getLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { levelId } = req.params;
    const userId = req.user!.id;
    const levelData = await getLevelDetails(levelId, userId);
    res.json(levelData);
  } catch (err) {
    next(err);
  }
};
