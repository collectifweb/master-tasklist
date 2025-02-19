import { useFormik } from 'formik';
import React, { useContext, useState } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
import { AuthContext } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SignUpPage = () => {
  const router = useRouter();
  const { signUp } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema = Yup.object().shape({
    email: Yup.string().required("Email est requis").email("Email invalide"),
    password: Yup.string()
      .required("Mot de passe est requis")
      .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: Yup.string()
      .required("Confirmation du mot de passe requise")
      .oneOf([Yup.ref('password')], "Les mots de passe doivent correspondre"),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await signUp(values.email, values.password);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen bg-background justify-center items-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Entrez votre email"
                {...formik.getFieldProps('email')}
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-sm text-destructive">{formik.errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Entrez votre mot de passe"
                {...formik.getFieldProps('password')}
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-sm text-destructive">{formik.errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirmez votre mot de passe"
                {...formik.getFieldProps('confirmPassword')}
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p className="text-sm text-destructive">{formik.errors.confirmPassword}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Création...' : 'Créer un compte'}
            </Button>

            <div className="text-center text-sm">
              <Button
                variant="link"
                onClick={() => router.push('/login')}
                className="p-0"
              >
                Déjà un compte? Se connecter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;