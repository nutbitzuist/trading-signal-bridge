'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Signal, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    new_password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token: searchParams.get('token') || '',
        },
    });

    const onSubmit = async (data: ResetPasswordForm) => {
        try {
            setIsLoading(true);
            setError('');
            await api.post('/auth/reset-password', {
                token: data.token,
                new_password: data.new_password,
            });
            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid or expired reset token');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Signal className="h-12 w-12 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Set new password</CardTitle>
                    <CardDescription>
                        {success
                            ? "Your password has been reset!"
                            : "Enter your reset token and new password"
                        }
                    </CardDescription>
                </CardHeader>

                {success ? (
                    <CardContent className="space-y-4">
                        <div className="bg-green-50 text-green-700 p-4 rounded-md text-center">
                            <p className="font-medium mb-2">Password reset successful!</p>
                            <p className="text-sm">
                                Redirecting you to login...
                            </p>
                        </div>
                        <Link href="/auth/login">
                            <Button className="w-full">
                                Go to Login
                            </Button>
                        </Link>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label htmlFor="token" className="text-sm font-medium">
                                    Reset Token
                                </label>
                                <Input
                                    id="token"
                                    type="text"
                                    placeholder="Paste your reset token here"
                                    {...register('token')}
                                />
                                {errors.token && (
                                    <p className="text-sm text-red-600">{errors.token.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="new_password" className="text-sm font-medium">
                                    New Password
                                </label>
                                <Input
                                    id="new_password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register('new_password')}
                                />
                                {errors.new_password && (
                                    <p className="text-sm text-red-600">{errors.new_password.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="confirm_password" className="text-sm font-medium">
                                    Confirm Password
                                </label>
                                <Input
                                    id="confirm_password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register('confirm_password')}
                                />
                                {errors.confirm_password && (
                                    <p className="text-sm text-red-600">{errors.confirm_password.message}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </CardFooter>
                    </form>
                )}

                <CardFooter className="flex justify-center pt-0">
                    <Link
                        href="/auth/login"
                        className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
