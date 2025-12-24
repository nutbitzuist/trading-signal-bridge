'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, ArrowLeft, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordForm) => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.post('/auth/forgot-password', { email: data.email });
            setSuccess(true);
            setResetToken(response.data.reset_token);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToken = async () => {
        if (resetToken) {
            await navigator.clipboard.writeText(resetToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-emerald-500 border-3 border-black flex items-center justify-center shadow-[4px_4px_0_0_#000]">
                            <TrendingUp className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Reset your password</CardTitle>
                    <CardDescription className="font-medium">
                        {success
                            ? "Password reset token generated"
                            : "Enter your email to receive a reset token"
                        }
                    </CardDescription>
                </CardHeader>

                {success ? (
                    <CardContent className="space-y-4">
                        <div className="bg-emerald-50 text-emerald-700 p-4 border-2 border-emerald-500">
                            <p className="font-bold mb-2">Reset token generated!</p>
                            <p className="text-sm mb-4 font-medium">
                                Copy this token and use it to reset your password:
                            </p>
                            {resetToken && (
                                <div className="flex items-center gap-2 bg-white p-3 border-2 border-black">
                                    <code className="flex-1 text-xs break-all font-mono">{resetToken}</code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyToken}
                                        className="shrink-0"
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Link href="/auth/reset-password">
                            <Button className="w-full">
                                Reset Password
                            </Button>
                        </Link>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 border-2 border-red-500 text-sm font-medium">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-bold">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-600 font-medium">{errors.email.message}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Get Reset Token'}
                            </Button>
                        </CardFooter>
                    </form>
                )}

                <CardFooter className="flex justify-center pt-0">
                    <Link
                        href="/auth/login"
                        className="text-sm text-gray-600 hover:text-emerald-600 flex items-center gap-1 font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
